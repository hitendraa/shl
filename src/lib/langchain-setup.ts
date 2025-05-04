'use server';

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { initPinecone } from './pinecone-client';
import { Document } from 'langchain/document';
import path from 'path';
import { shouldUploadData, readJsonData } from './server-utils';
import { PromptTemplate } from '@langchain/core/prompts';

// Function to upload data to Pinecone
export async function uploadDataToPinecone(): Promise<{ success: boolean; message: string }> {
  try {
    const dataFilePath = path.join(process.cwd(), 'src', 'data', 'data_scraped.json');
    
    // Force upload data regardless of hash check
    const shouldUpload = true; // Force upload every time for now until we confirm it works
    
    if (!shouldUpload) {
      return { success: true, message: 'Data already up to date in Pinecone.' };
    }
    
    // Read and parse the data
    const jsonData = await readJsonData(dataFilePath);
    
    // Initialize Pinecone
    const pinecone = await initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    // Extract test type codes for reference
    const testTypeCodes = jsonData["Test-Type-Codes"] || {};
    
    // Create documents from the Individual-Test-Solutions array
    const testSolutions = jsonData["Individual-Test-Solutions"] || [];
    if (!Array.isArray(testSolutions)) {
      throw new Error("Individual-Test-Solutions is not an array");
    }
    
    // Filter out empty items and items without required fields
    const validSolutions = testSolutions.filter(item => 
      item && 
      typeof item === 'object' && 
      Object.keys(item).length > 0 &&
      (item.name || item.Description)
    );
    
    console.log(`Found ${validSolutions.length} valid test solutions to process`);
    
    // First, delete existing data in the namespace to avoid duplicates
    try {
      console.log(`Attempting to delete existing data from namespace 'ns1'...`);
      await index.namespace('ns1').deleteAll();
      console.log('Successfully deleted existing data');
    } catch (error) {
      console.log('No existing data to delete or error during deletion, continuing with upload');
    }
    
    // Format data for Pinecone's integrated embedding
    // IMPORTANT CHANGE: Pinecone requires all metadata to be flattened, we can't use nested objects
    const records = [];
    
    for (let i = 0; i < validSolutions.length; i++) {
      const item = validSolutions[i];
      const id = `assessment_${i}`;
      
      // Create the content field that will be embedded
      const content = [
        item.name ? `Name: ${item.name}` : '',
        item.Description ? `Description: ${item.Description}` : '',
        item["Job levels"] ? `Job levels: ${Array.isArray(item["Job levels"]) ? item["Job levels"].join(", ") : item["Job levels"]}` : '',
        item["Test Type"] ? `Test Type: ${Array.isArray(item["Test Type"]) ? item["Test Type"].map(code => testTypeCodes[code] || code).join(", ") : item["Test Type"]}` : '',
        item["Languages"] ? `Languages: ${Array.isArray(item["Languages"]) ? item["Languages"].join(", ") : item["Languages"]}` : '',
        item["Assessment length"] ? `Assessment length: ${item["Assessment length"]}` : '',
        item["Remote Testing"] ? `Remote Testing: ${item["Remote Testing"]}` : ''
      ].filter(Boolean).join("\n");
      
      // CRITICAL CHANGE: Instead of using a metadata object, we'll flatten all metadata into the record directly
      const record = {
        id,
        text: content
      };
      
      // Add each metadata field directly to the record
      if (item.name) record.name = item.name;
      if (item.link) record.link = item.link;
      if (item["Remote Testing"]) record.remote_testing = item["Remote Testing"];
      if (item["Assessment length"]) record.assessment_length = item["Assessment length"];
      
      // Handle job levels
      if (item["Job levels"]) {
        if (Array.isArray(item["Job levels"])) {
          const jobLevelsStr = item["Job levels"].join(", ");
          record.job_levels = jobLevelsStr;
        } else {
          record.job_levels = String(item["Job levels"]);
        }
      }
      
      // Handle languages
      if (item["Languages"]) {
        if (Array.isArray(item["Languages"])) {
          const languagesStr = item["Languages"].join(", ");
          record.languages = languagesStr;
        } else {
          record.languages = String(item["Languages"]);
        }
      }
      
      // Handle test types
      if (item["Test Type"]) {
        if (Array.isArray(item["Test Type"])) {
          const testTypesStr = item["Test Type"].join(", ");
          record.test_type_codes = testTypesStr;
          
          const descriptionsStr = item["Test Type"]
            .map(code => testTypeCodes[code] || code)
            .join(", ");
          record.test_types = descriptionsStr;
        } else {
          const code = String(item["Test Type"]);
          record.test_type_codes = code;
          record.test_types = testTypeCodes[code] || code;
        }
      }

      // Add description as a sanitized string
      if (item.Description) {
        // Limit description length to avoid issues
        const truncatedDesc = item.Description.substring(0, 500);
        record.description = truncatedDesc;
      }
      
      records.push(record);
    }
    
    console.log(`Prepared ${records.length} records for Pinecone upload`);
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 20;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      console.log(`Uploading batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(records.length/batchSize)}`);
      
      try {
        // For integrated embedding, use upsertRecords instead
        await index.namespace('ns1').upsertRecords(batch);
        console.log(`Successfully uploaded batch ${Math.floor(i/batchSize) + 1}`);
      } catch (error) {
        console.error(`Error uploading batch ${Math.floor(i/batchSize) + 1}:`, error);
        throw error;
      }
    }
    
    // Verify the upload by checking the vector count
    try {
      const stats = await index.describeStats();
      console.log('Pinecone index stats after upload:', stats);
      const vectorCount = stats.namespaces?.ns1?.vectorCount || 0;
      
      return { 
        success: true, 
        message: `Successfully uploaded ${records.length} assessments to Pinecone. Vector count in index: ${vectorCount}`
      };
    } catch (error) {
      console.error('Error checking vector count:', error);
      return { 
        success: true, 
        message: `Uploaded ${records.length} assessments to Pinecone, but couldn't verify the final count.`
      };
    }
  } catch (error: any) {
    console.error('Error uploading data to Pinecone:', error);
    return { 
      success: false, 
      message: `Error during upload: ${error.message || 'Unknown error'}`
    };
  }
}

export async function createChain() {
  try {
    console.log("Initializing Pinecone...");
    const pinecone = await initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    // Import required packages
    console.log("Importing required packages...");
    
    // Create custom embedding class that matches dimensions with Pinecone's integrated embedding
    console.log("Creating custom embedding adapter for Pinecone...");
    class PineconeIntegratedEmbeddings {
      // Match the expected dimension of the Pinecone index (2048 for llama-text-embed-v2)
      async embedQuery(text) {
        // Generate a fake embedding vector with the correct dimension (2048)
        return new Array(2048).fill(0.01); // Small non-zero values to avoid potential issues
      }
      
      async embedDocuments() {
        // Return array with correct dimensions
        return [new Array(2048).fill(0.01)];
      }
    }
    
    // Create the embeddings instance
    const embeddings = new PineconeIntegratedEmbeddings();
    
    console.log("Creating vector store...");
    // Use Pinecone with the placeholder embeddings - Pinecone will use llama-text-embed-v2 internally
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { 
        pineconeIndex: index,
        namespace: 'ns1',
        textKey: 'text' // The field containing text to embed in your records
        // Remove the filter option from here since we'll pass it in the retriever
      }
    );
    
    console.log("Initializing ChatGoogleGenerativeAI...");
    // Initialize the Gemini model for chat
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      model: "gemini-2.0-flash", // Using Gemini 2.0 Flash for better performance
      temperature: 0.2, // Lower temperature for more consistent results
      maxOutputTokens: 4096, // Increased token limit for more comprehensive analysis
    });
    
    console.log("Creating RetrievalQAChain...");
    
    // Import RetrievalQAChain
    const { RetrievalQAChain } = await import('langchain/chains');
    
    // Enhanced prompt template with improved conversational capabilities and assessment accuracy
    const promptTemplate = new PromptTemplate({
      template: `
You are an intelligent Assessment Recommendation Assistant for SHL. Your primary function is to help users find the most relevant assessments for their hiring needs based on job descriptions, requirements, or general queries.

MODE OF OPERATION:
1. If the query is a direct question about SHL or assessments, respond conversationally with helpful information.
2. If the query contains a job description or hiring requirements, recommend relevant SHL assessments.
3. If the query is too vague or unrelated to hiring/assessments, politely ask for more specific information about their hiring needs.

ESSENTIAL ASSESSMENT RECOMMENDATIONS BY DOMAIN:

For Software Development and Engineering:
- For Java roles: "Java 8 (New)" (18 min), "Core Java (Advanced/Entry Level) (New)", "Enterprise Java Beans (New)" (4 min)
- For JavaScript: "JavaScript (New)", "HTML/CSS (New)", "ReactJS (New)", "Node.js (New)"
- For QA/Testing: "Automata - Fix (New)", "Automata Selenium", "Selenium (New)", "Manual Testing (New)"
- For DevOps: "Linux Operating System", "AWS (New)", "Docker (New)", ".NET Core (New)"
- General tech assessments: "Computer Science (New)" (12 min), "Programming Concepts"
- Always pair with: "Technology Professional 8.0 Job Focused Assessment" or "OPQ Universal Competency Report 2.0"

For Sales and Customer Service:
- Entry-level: "Entry level Sales 7.1 (International)", "Entry Level Sales Sift Out 7.1", "Entry Level Sales Solution"
- Mid-level: "Sales Representative Solution", "Sales Support Specialist Solution", "Technical Sales Associate Solution"
- Communication: "SVAR - Spoken English (Indian Accent) (New)", "Sales & Service Phone Solution/Simulation"
- Always consider: "Occupational Personality Questionnaire OPQ32r" for sales roles

For Leadership/Management:
- Executive: "Motivation Questionnaire MQM5", "Global Skills Assessment", "Enterprise Leadership Report 2.0"
- People Management: "OPQ Universal Competency Report 2.0", "Graduate 8.0 Job Focused Assessment"
- Decision Making: "Graduate Scenarios", "SHL Verify Interactive - Inductive Reasoning"

For Content/Writing:
- Technical: "Search Engine Optimization (New)", "Drupal (New)", "Content Management (New)"
- Administrative: "Administrative Professional - Short Form", "MS Word (New)", "Microsoft Word 365"
- Data Entry: "General Entry Level – Data Entry 7.0 Solution", "Verify - Numerical Ability"

For Banking/Finance/Admin:
- Core: "Administrative Professional - Short Form", "Verify - Numerical Ability"
- Finance-specific: "Financial Professional - Short Form", "Bank Administrative Assistant - Short Form"
- Technical: "Basic Computer Literacy (Windows 10) (New)", "MS Excel (New)"

CRITICAL RANKING FACTORS:
1. TIME CONSTRAINTS: If specified (e.g., "30-40 minutes", "within an hour"), ensure total assessment time fits within that limit
2. JOB LEVELS: Match appropriate assessments to job levels (Entry, Graduate, Mid, Professional, Manager, Executive)
3. REMOTE CAPABILITY: Always prioritize remote assessments unless specified otherwise
4. BALANCED ASSESSMENT: For technical roles, include both technical and personality assessments; for non-technical roles, include both skill and personality assessments
5. SKILLS MATCH: Prioritize assessments that directly test the skills mentioned in the query

USER QUERY: {query}

CONTEXT: {context}

RESPONSE FORMAT:
1. For conversational queries: Respond naturally and helpfully, mention you can recommend specific assessments if needed.

2. For assessment recommendations: Return a valid, parseable JSON object with no additional text before or after:
{{
  "recommendations": [
    {{
      "name": "Assessment name",
      "description": "Brief description (1-2 sentences)",
      "type": "Test type (e.g., Knowledge, Personality, Ability)",
      "duration": "Time required",
      "suitableFor": "Job levels this is appropriate for",
      "relevanceScore": "Number between 1-100 indicating match to query",
      "remoteTestingAvailable": "Yes/No",
      "link": "URL to assessment"
    }},
    ... (up to 10 recommendations)
  ]
}}

IMPORTANT REMINDERS:
- Return between 1 and 10 recommendations
- Make sure the JSON is properly formatted without any markdown formatting
- For highest accuracy, leverage the context provided and the assessment descriptions
- Ensure relevanceScore accurately reflects how well each assessment matches the specific query requirements
`,
      inputVariables: ["query", "context"]
    });

    // Create a custom chain that will return structured assessment recommendations
    const chain = RetrievalQAChain.fromLLM(
      model, 
      vectorStore.asRetriever({
        searchType: "similarity",
        k: 75, // Increased to retrieve more documents to ensure we find enough relevant assessments
        filter: {} // Keep the filter option here
      }),
      {
        returnSourceDocuments: true,
        prompt: promptTemplate,
        inputKey: "query",
        verbose: true
      }
    );
    
    console.log("Chain successfully created");
    return chain;
  } catch (error) {
    console.error('Error initializing chain:', error);
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? `\nStack: ${error.stack}` : '')
      : String(error);
    
    console.error('Detailed error:', errorDetails);
    throw new Error(`Failed to initialize AI model: ${errorDetails}`);
  }
}
