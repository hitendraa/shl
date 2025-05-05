'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12">
      <div className="w-full max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">About SHL Assessment Recommender</h1>
        
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>How our recommender system works</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-blue max-w-none">
              <p>
                The SHL Assessment Recommender is an AI-powered system that helps match the right SHL assessments to your hiring needs.
                It uses advanced natural language processing and vector search technology to understand your requirements and find the most relevant assessments.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technical Architecture</CardTitle>
              <CardDescription>Key components and technologies used</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">1. Frontend (Next.js & React)</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Modern, responsive UI built with Next.js 14</li>
                  <li>Real-time search interface with loading states</li>
                  <li>Dynamic assessment cards with relevance scoring</li>
                  <li>Evaluation system for testing recommendation quality</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">2. Backend Technologies</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Google Gemini API for natural language understanding</li>
                  <li>Pinecone vector database for semantic search</li>
                  <li>LangChain for orchestrating the AI workflow</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3. Data Processing</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Automatic data synchronization with Pinecone</li>
                  <li>Smart caching system to prevent unnecessary uploads</li>
                  <li>Efficient batch processing for large datasets</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>The recommendation process explained</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-6 space-y-4">
                <li>
                  <strong>Query Understanding:</strong>
                  <p className="mt-1">
                    When you submit a query, our system uses Google&apos;s Gemini AI to understand the context, required skills, job levels, and time constraints.
                  </p>
                </li>
                <li>
                  <strong>Semantic Search:</strong>
                  <p className="mt-1">
                    The system searches through our vector database (Pinecone) to find assessments that semantically match your requirements.
                  </p>
                </li>
                <li>
                  <strong>Smart Ranking:</strong>
                  <p className="mt-1">
                    Results are ranked based on multiple factors including relevance score, time constraints, and job level matching.
                  </p>
                </li>
                <li>
                  <strong>Result Processing:</strong>
                  <p className="mt-1">
                    The system formats the results, adds relevant metadata, and ensures all recommended assessments are accessible.
                  </p>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evaluation Metrics</CardTitle>
              <CardDescription>How we measure recommendation quality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Key Metrics:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Recall@K:</strong> Measures how many relevant assessments are found among the top K recommendations
                  </li>
                  <li>
                    <strong>Precision@K:</strong> Measures the accuracy of recommendations at different positions
                  </li>
                  <li>
                    <strong>Mean Average Precision (MAP):</strong> Provides an overall score for recommendation quality
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Usage</CardTitle>
              <CardDescription>How to use the Assessment Recommender API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Endpoint</h3>
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                  <code>POST /api/search</code>
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Request Format</h3>
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                  <code>{`{
  "query": "Your search query or requirements here"
}`}</code>
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Response Format</h3>
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                  <code>{`{
  "success": true,
  "query": "Original query",
  "recommendations": [
    {
      "name": "Assessment name",
      "description": "Assessment description",
      "type": "Test type",
      "duration": "Time required",
      "suitableFor": "Job levels",
      "relevanceScore": 85,
      "remoteTestingAvailable": "Yes",
      "link": "URL to assessment"
    }
  ]
}`}</code>
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Example Usage</h3>
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                  <code>{`fetch('/api/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "Looking for Java developer assessments under 45 minutes"
  })
})`}</code>
                </pre>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Notes</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The API returns up to 10 most relevant recommendations</li>
                  <li>Relevance scores range from 0 to 100</li>
                  <li>Include specific requirements like skills, job levels, or time constraints in your query for better results</li>
                  <li>CORS is enabled for secure cross-origin requests</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}