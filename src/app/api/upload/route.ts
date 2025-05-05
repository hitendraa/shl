import { uploadDataToPinecone } from '@/lib/langchain-setup';

export async function POST() {
  try {
    const result = await uploadDataToPinecone();
    return Response.json(result);
  } catch (error: unknown) {
    console.error('Error in upload route:', error);
    return Response.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unknown error occurred' 
      }, 
      { status: 500 }
    );
  }
}