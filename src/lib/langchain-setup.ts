'use server';

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { initPinecone } from './pinecone-client';
import path from 'path';
import { readJsonData } from './server-utils';
import { PromptTemplate } from '@langchain/core/prompts';
import { BaseLanguageModel } from '@langchain/core/language_models/base';

interface TestTypeCode {
  [key: string]: string;
}

interface TestSolution {
  name?: string;
  Description?: string;
  'Job levels'?: string[] | string;
  'Test Type'?: string[] | string;
  'Languages'?: string[] | string;
  'Assessment length'?: string;
  'Remote Testing'?: string;
  link?: string;
}

interface PineconeRecord {
  id: string;
  text: string;
  name: string;
  link: string;
  remote_testing: string;
  assessment_length: string;
  job_levels: string;
  languages: string;
  test_type_codes: string;
  test_types: string;
  description: string;
  [key: string]: string;
}


// @typescript-eslint/no-unused-vars
class PineconeIntegratedEmbeddings {
  async embedQuery(): Promise<number[]> {
    // Static embedding for demonstration
    return new Array(2048).fill(0.01);
  }
  
  async embedDocuments(): Promise<number[][]> {
    // Static embedding for demonstration
    return [new Array(2048).fill(0.01)];
  }
}

export async function uploadDataToPinecone(): Promise<{ success: boolean; message: string }> {
  try {
    const dataFilePath = path.join(process.cwd(), 'src', 'data', 'data_scraped.json');
    
    // Force upload data regardless of hash check
    const shouldUpload = true;
    
    if (!shouldUpload) {
      return { success: true, message: 'Data already up to date in Pinecone.' };
    }
    
    // Read and parse the data
    const jsonData = await readJsonData(dataFilePath) as { 
      "Test-Type-Codes": TestTypeCode;
      "Individual-Test-Solutions": unknown[];
    };
    
    // Initialize Pinecone
    const pinecone = await initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    // Extract test type codes for reference
    const testTypeCodes: TestTypeCode = jsonData["Test-Type-Codes"] || {};
    
    // Create documents from the Individual-Test-Solutions array
    const testSolutions = jsonData["Individual-Test-Solutions"] || [];
    if (!Array.isArray(testSolutions)) {
      throw new Error("Individual-Test-Solutions is not an array");
    }
    
    // Filter out empty items and items without required fields
    const validSolutions = testSolutions.filter((item): item is TestSolution => 
      item !== null && 
      typeof item === 'object' && 
      Object.keys(item).length > 0 &&
      ('name' in item || 'Description' in item)
    );
    
    console.log(`Found ${validSolutions.length} valid test solutions to process`);
    
    // First, delete existing data in the namespace to avoid duplicates
    try {
      console.log(`Attempting to delete existing data from namespace 'ns1'...`);
      await index.namespace('ns1').deleteAll();
      console.log('Successfully deleted existing data');
    } catch (error) {
      console.log('No existing data to delete or error during deletion, continuing with upload', error);
    }
    
    // Format data for Pinecone's integrated embedding
    const records: PineconeRecord[] = [];
    
    for (let i = 0; i < validSolutions.length; i++) {
      const item = validSolutions[i];
      const id = `assessment_${i}`;
      
      const content = [
        item.name ? `Name: ${item.name}` : '',
        item.Description ? `Description: ${item.Description}` : '',
        item["Job levels"] ? `Job levels: ${Array.isArray(item["Job levels"]) ? item["Job levels"].join(", ") : item["Job levels"]}` : '',
        item["Test Type"] ? `Test Type: ${Array.isArray(item["Test Type"]) ? item["Test Type"].map(code => testTypeCodes[code] || code).join(", ") : item["Test Type"]}` : '',
        item["Languages"] ? `Languages: ${Array.isArray(item["Languages"]) ? item["Languages"].join(", ") : item["Languages"]}` : '',
        item["Assessment length"] ? `Assessment length: ${item["Assessment length"]}` : '',
        item["Remote Testing"] ? `Remote Testing: ${item["Remote Testing"]}` : ''
      ].filter(Boolean).join("\n");
      
      const record: PineconeRecord = {
        id,
        text: content,
        name: '',
        link: '',
        remote_testing: '',
        assessment_length: '',
        job_levels: '',
        languages: '',
        test_type_codes: '',
        test_types: '',
        description: ''
      };
      
      if (item.name) record.name = item.name;
      if (item.link) record.link = item.link;
      if (item["Remote Testing"]) record.remote_testing = item["Remote Testing"];
      if (item["Assessment length"]) record.assessment_length = item["Assessment length"];
      
      if (item["Job levels"]) {
        record.job_levels = Array.isArray(item["Job levels"]) 
          ? item["Job levels"].join(", ")
          : String(item["Job levels"]);
      }
      
      if (item["Languages"]) {
        record.languages = Array.isArray(item["Languages"])
          ? item["Languages"].join(", ")
          : String(item["Languages"]);
      }
      
      if (item["Test Type"]) {
        if (Array.isArray(item["Test Type"])) {
          record.test_type_codes = item["Test Type"].join(", ");
          record.test_types = item["Test Type"]
            .map(code => testTypeCodes[code] || code)
            .join(", ");
        } else {
          const code = String(item["Test Type"]);
          record.test_type_codes = code;
          record.test_types = testTypeCodes[code] || code;
        }
      }

      if (item.Description) {
        record.description = item.Description.substring(0, 500);
      }
      
      records.push(record);
    }
    
    // Process in smaller batches
    const batchSize = 20;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await index.namespace('ns1').upsertRecords(batch);
    }
    
    // Verify the upload by checking the vector count
    try {
      const stats = await index.describeIndexStats();
      const recordCount = stats.namespaces?.ns1?.recordCount || 0;
      
      return { 
        success: true, 
        message: `Successfully uploaded ${records.length} assessments to Pinecone. Vector count in index: ${recordCount}`
      };
    } catch (error) {
      console.error('Error checking vector count:', error);
      return { 
        success: true, 
        message: `Uploaded ${records.length} assessments to Pinecone, but couldn't verify the final count.`
      };
    }
  } catch (error: unknown) {
    console.error('Error uploading data to Pinecone:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createChain() {
  try {
    console.log("Initializing Pinecone...");
    const pinecone = await initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    // Create custom embedding class that matches dimensions with Pinecone's integrated embedding
    console.log("Creating custom embedding adapter for Pinecone...");
    const embeddings = new PineconeIntegratedEmbeddings();
    
    console.log("Creating vector store...");
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { 
        pineconeIndex: index,
        namespace: 'ns1',
        textKey: 'text'
      }
    );
    
    console.log("Initializing ChatGoogleGenerativeAI...");
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      model: "gemini-2.0-flash",
      temperature: 0.2,
      maxOutputTokens: 4096,
    });
    
    console.log("Creating RetrievalQAChain...");
    
    const { RetrievalQAChain } = await import('langchain/chains');
    
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

    const chain = RetrievalQAChain.fromLLM(
      model as BaseLanguageModel,
      vectorStore.asRetriever({
        searchType: "similarity",
        k: 75,
        filter: {}
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
  } catch (error: unknown) {
    console.error('Error initializing chain:', error);
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? `\nStack: ${error.stack}` : '')
      : String(error);
    
    console.error('Detailed error:', errorDetails);
    throw new Error(`Failed to initialize AI model: ${errorDetails}`);
  }
}
