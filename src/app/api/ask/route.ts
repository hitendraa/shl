import { NextRequest } from 'next/server';
import { createChain } from '@/lib/langchain-setup';

export async function POST(req: NextRequest) {
  console.log('------------- API ROUTE: Starting recommendation process -------------');
  const startTime = performance.now();
  
  try {
    // Parse the request body
    const body = await req.json();
    const question = body.question;
    
    if (!question) {
      return Response.json({ error: 'No question provided' }, { status: 400 });
    }
    
    console.log(`Query received: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);
    
    // Initialize the chain
    console.log('Creating chain...');
    const chain = await createChain();
    
    console.log('Executing chain with query...');
    const chainStartTime = performance.now();
    
    // Execute the chain
    const result = await chain.invoke({
      query: question
    });
    
    const chainEndTime = performance.now();
    console.log(`Chain execution completed in ${((chainEndTime - chainStartTime) / 1000).toFixed(2)} seconds`);
    
    // Debug information about source documents
    if (result.sourceDocuments) {
      console.log(`Retrieved ${result.sourceDocuments.length} source documents`);
    }
    
    console.log('Original response:', result.text?.substring(0, 200));
    
    // Clean and parse the response text
    let parsedResponse;
    let isConversational = false;
    
    try {
      // First, detect if this is a conversational response or JSON
      let trimmedText = result.text ? result.text.trim() : '';
      
      // If response contains markdown code blocks, extract just the JSON
      const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/;
      const jsonMatch = trimmedText.match(jsonRegex);
      
      if (jsonMatch) {
        console.log('Found JSON in markdown blocks or raw text');
        trimmedText = (jsonMatch[1] || jsonMatch[2]).trim();
      }
      
      // Check if the response appears to be JSON
      if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
        // Parse the JSON content
        parsedResponse = JSON.parse(trimmedText);
        console.log('Response parsed as JSON recommendations');
        
        // Ensure the recommendations have all required fields
        if (parsedResponse.recommendations) {
          interface RecommendationInput {
            name?: string;
            description?: string;
            type?: string;
            duration?: string;
            suitableFor?: string;
            relevanceScore?: string | number;
            remoteTestingAvailable?: string;
            link?: string;
          }

          interface ProcessedRecommendation {
            name: string;
            description: string;
            type: string;
            duration: string;
            suitableFor: string;
            relevanceScore: number;
            remoteTestingAvailable: string;
            link: string;
          }

          interface SourceDocument {
            metadata?: {
              name?: string;
              link?: string;
            };
          }

                    parsedResponse.recommendations = parsedResponse.recommendations.map((rec: RecommendationInput): ProcessedRecommendation => {
                      // Get base SHL URL
                      const baseUrl: string = 'https://www.shl.com/solutions/products/product-catalog/';
                      
                      // Create a slug from the name
                      const slug: string = rec.name
                        ? rec.name
                            .toLowerCase()
                            .replace(/\s*\|\s*shl\s*$/i, '')  // Remove "| SHL" if present
                            .replace(/\(new\)/i, '-new')      // Format (New) as -new
                            .replace(/\s+/g, '-')            // Replace spaces with hyphens
                            .replace(/[^\w-]/g, '')          // Remove special characters
                        : '';
                        
                      // Handle different link patterns
                      let finalLink: string = rec.link && rec.link !== "URL to assessment"
                        ? rec.link.startsWith('http') ? rec.link : `${baseUrl}view/${rec.link}/`
                        : `${baseUrl}view/${slug}/`;
                      
                      // Find a real assessment with this name in the source documents
                      const matchingSource: SourceDocument | undefined = result.sourceDocuments ? 
                        result.sourceDocuments.find((doc: SourceDocument) => 
                          doc.metadata?.name?.toLowerCase() === rec.name?.toLowerCase() ||
                          (doc.metadata?.name?.toLowerCase() && rec.name && doc.metadata.name.toLowerCase().includes(rec.name.toLowerCase()))
                        ) : null;
                        
                      if (matchingSource && matchingSource.metadata?.link) {
                        finalLink = matchingSource.metadata.link;
                        console.log(`Found matching source document for ${rec.name}`);
                      }
                      
                      return {
                        name: rec.name || "Unknown Assessment",
                        description: rec.description || "No description available",
                        type: rec.type || "Not specified",
                        duration: rec.duration || "Not specified",
                        suitableFor: rec.suitableFor || "All levels",
                        relevanceScore: typeof rec.relevanceScore === 'string' 
                          ? parseInt(rec.relevanceScore, 10) 
                          : rec.relevanceScore || 70,
                        remoteTestingAvailable: rec.remoteTestingAvailable || "Yes",
                        link: finalLink
                      };
                    });
          
          console.log(`Processed ${parsedResponse.recommendations.length} recommendations with links`);
          if (parsedResponse.recommendations.length > 0) {
            console.log(`Example link: ${parsedResponse.recommendations[0].link}`);
          }
        }
      } else {
        // This is a conversational response
        isConversational = true;
        parsedResponse = { 
          conversationalResponse: trimmedText,
          recommendations: [] 
        };
        console.log('Response parsed as conversational');
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      
      // If parsing failed, try one more approach by directly extracting the recommendations array
      const recArrayMatch = result.text.match(/"recommendations"\s*:\s*(\[\s*\{[\s\S]*?\}\s*\])/);
      if (recArrayMatch) {
        try {
          // Try to parse just the recommendations array
          const recArray = JSON.parse(recArrayMatch[1]);
          console.log('Extracted recommendations array directly');
          
          // Create the full response object
            interface RecommendationInput {
            name?: string;
            description?: string;
            type?: string;
            duration?: string;
            suitableFor?: string;
            relevanceScore?: string | number;
            remoteTestingAvailable?: string;
            link?: string;
            }

            interface ProcessedRecommendation {
            name: string;
            description: string;
            type: string;
            duration: string;
            suitableFor: string;
            relevanceScore: number;
            remoteTestingAvailable: string;
            link: string;
            }

            interface ResponseWithRecommendations {
            recommendations: ProcessedRecommendation[];
            }

            parsedResponse = {
            recommendations: recArray.map((rec: RecommendationInput): ProcessedRecommendation => ({
              name: rec.name || "Unknown Assessment",
              description: rec.description || "No description available",
              type: rec.type || "Not specified",
              duration: rec.duration || "Not specified",
              suitableFor: rec.suitableFor || "All levels",
              relevanceScore: typeof rec.relevanceScore === 'string' 
              ? parseInt(rec.relevanceScore, 10) 
              : rec.relevanceScore || 70,
              remoteTestingAvailable: rec.remoteTestingAvailable || "Yes",
              link: (rec.link ?? "URL to assessment") === "URL to assessment" ? 
              `https://www.shl.com/solutions/products/product-catalog/view/${(rec.name || "unknown-assessment").toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}/` : 
              rec.link ?? ""
            }))
            } as ResponseWithRecommendations;
          
          console.log('Successfully created parsedResponse from extracted recommendations');
        } catch (innerError) {
          console.error('Failed to parse recommendations array:', innerError);
          isConversational = true;
          parsedResponse = { 
            conversationalResponse: "I found some assessment options but couldn't format them correctly. Please try again.",
            recommendations: []
          };
        }
      } else {
        // If we couldn't extract recommendations, treat it as a conversational response
        isConversational = true;
        parsedResponse = { 
          conversationalResponse: result.text,
          recommendations: [] 
        };
        console.log('No recommendations found, treating as conversational');
      }
    }
    
    // Debug the recommendations if they exist
    if (!isConversational && parsedResponse && parsedResponse.recommendations) {
      console.log(`Found ${parsedResponse.recommendations.length} recommendations`);
      if (parsedResponse.recommendations.length > 0) {
        console.log(`Sample recommendation fields: ${Object.keys(parsedResponse.recommendations[0] || {}).join(', ')}`);
      }
    }
    
    const endTime = performance.now();
    console.log(`Total request processing time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log('------------- API ROUTE: Finished recommendation process -------------');
    
    return Response.json(parsedResponse);
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json({ 
      error: 'An error occurred while processing your request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
