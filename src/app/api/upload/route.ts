import { uploadDataToPinecone } from '@/lib/langchain-setup';

export async function POST() {
  try {
    const result = await uploadDataToPinecone();
    return Response.json(result);
  } catch (error: any) {
    console.error('Error in upload route:', error);
    return Response.json(
      { success: false, message: error.message || 'An unknown error occurred' }, 
      { status: 500 }
    );
  }
}