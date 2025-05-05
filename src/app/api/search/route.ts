import { NextRequest } from 'next/server';
import { createChain } from '@/lib/langchain-setup';
import { headers } from 'next/headers';

// Types for our response
interface Recommendation {
  name: string;
  description: string;
  type: string;
  duration: string;
  suitableFor: string;
  relevanceScore: number;
  remoteTestingAvailable: string;
  link: string;
}

interface ApiResponse {
  success: boolean;
  query?: string;
  recommendations?: Recommendation[];
  error?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  console.log('------------- API Search: Starting recommendation process -------------');
  const startTime = performance.now();
  
  // Set CORS headers
  const headersList = await headers();
  const origin = headersList.get('origin');
  
  // Define allowed origins (you can modify this based on your needs)
  const allowedOrigins = [
    'http://localhost:3000',
    'https://shl-one.vercel.app/' // Replace with your domain
  ];
  
  const corsHeaders = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') 
      ? origin!
      : allowedOrigins[0],
  };
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    // Parse the request body
    const body = await req.json();
    const query = body.query;
    
    if (!query) {
      return Response.json(
        { 
          success: false,
          error: 'Query parameter is required'
        } as ApiResponse, 
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }
    
    console.log(`API Query received: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    // Initialize the chain
    console.log('Creating chain...');
    const chain = await createChain();
    
    console.log('Executing chain with query...');
    const chainStartTime = performance.now();
    
    // Execute the chain
    const result = await chain.invoke({
      query: query
    });
    
    const chainEndTime = performance.now();
    console.log(`Chain execution completed in ${((chainEndTime - chainStartTime) / 1000).toFixed(2)} seconds`);
    
    // Parse and format the response
    let response: ApiResponse;
    
    try {
      // Extract JSON from the response if present
      const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/;
      const jsonMatch = result.text.match(jsonRegex);
      
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[2]);
        
        if (parsedResult.recommendations && Array.isArray(parsedResult.recommendations)) {
          // Format recommendations
          interface RawRecommendation {
            name?: string;
            description?: string;
            type?: string;
            duration?: string;
            suitableFor?: string;
            relevanceScore?: string | number;
            remoteTestingAvailable?: string;
            link?: string;
          }

          const formattedRecommendations: Recommendation[] = parsedResult.recommendations
            .slice(0, 10)
            .map((rec: RawRecommendation): Recommendation => ({
              name: rec.name || "Unknown Assessment",
              description: rec.description || "No description available",
              type: rec.type || "Not specified",
              duration: rec.duration || "Not specified",
              suitableFor: rec.suitableFor || "All levels",
              relevanceScore: typeof rec.relevanceScore === 'string' 
                ? parseInt(rec.relevanceScore, 10) 
                : rec.relevanceScore || 70,
              remoteTestingAvailable: rec.remoteTestingAvailable || "Yes",
              link: rec.link || "https://www.shl.com/solutions/products/product-catalog/"
            }));
            
          response = {
            success: true,
            query,
            recommendations: formattedRecommendations
          };
        } else {
          throw new Error('No recommendations found in response');
        }
      } else {
        // Handle conversational responses
        response = {
          success: true,
          query,
          message: result.text,
          recommendations: []
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      response = {
        success: false,
        query,
        error: 'Failed to process recommendations',
        recommendations: []
      };
    }
    
    const endTime = performance.now();
    console.log(`Total API request processing time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log('------------- API Search: Finished recommendation process -------------');
    
    return Response.json(response, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Error processing API request:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    } as ApiResponse, { 
      status: 500,
      headers: corsHeaders
    });
  }
}