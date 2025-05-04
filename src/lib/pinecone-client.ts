'use server';

import { Pinecone } from '@pinecone-database/pinecone';

export async function initPinecone() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  return pinecone;
}
