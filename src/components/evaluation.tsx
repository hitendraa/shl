import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the test set with benchmark queries and expected assessments
const testSet = [
  {
    id: "java-dev",
    query: "I am hiring for Java developers who can also collaborate effectively with my business teams. Looking for an assessment(s) that can be completed in 40 minutes.",
    expectedAssessments: [
      "Core Java (Entry Level) (New)",
      "Java 8 (New)",
      "Core Java (Advanced Level) (New)",
      "Automata - Fix (New)",
      "Agile Software Development",
      "Technology Professional 8.0 Job Focused Assessment",
      "Computer Science (New)"
    ]
  },
  {
    id: "sales-role",
    query: "I want to hire new graduates for a sales role in my company, the budget is for about an hour for each test. Give me some options",
    expectedAssessments: [
      "Entry level Sales 7.1 (International)",
      "Entry Level Sales Sift Out 7.1",
      "Entry Level Sales Solution",
      "Sales Representative Solution",
      "Sales Support Specialist Solution",
      "Technical Sales Associate Solution",
      "SVAR - Spoken English (Indian Accent) (New)",
      "Sales & Service Phone Solution",
      "Sales & Service Phone Simulation",
      "English Comprehension (New)"
    ]
  },
  {
    id: "coo-china",
    query: "I am looking for a COO for my company in China and I want to see if they are culturally a right fit for our company. Suggest me an assessment that they can complete in about an hour",
    expectedAssessments: [
      "Motivation Questionnaire MQM5",
      "Global Skills Assessment",
      "Graduate 8.0 Job Focused Assessment"
    ]
  },
  {
    id: "content-writer",
    query: "Content Writer required, expert in English and SEO.",
    expectedAssessments: [
      "Drupal (New)",
      "Search Engine Optimization (New)",
      "Administrative Professional - Short Form",
      "Entry Level Sales Sift Out 7.1",
      "General Entry Level – Data Entry 7.0 Solution"
    ]
  },
  {
    id: "bank-admin",
    query: "ICICI Bank Assistant Admin, Experience required 0-2 years, test should be 30-40 mins long",
    expectedAssessments: [
      "Administrative Professional - Short Form",
      "Verify - Numerical Ability",
      "Financial Professional - Short Form",
      "Bank Administrative Assistant - Short Form",
      "General Entry Level – Data Entry 7.0 Solution",
      "Basic Computer Literacy (Windows 10) (New)"
    ]
  }
];

interface Recommendation {
  name: string;
  description: string;
  type: string;
  duration: string;
  suitableFor: string;
  relevanceScore: number | string;
  remoteTestingAvailable: string;
  link: string;
}

interface TestResult {
  query: string;
  expectedAssessments: string[];
  actualAssessments: string[];
  matches: string[];
  missing: string[];
  extra: string[];
  recall: number;
  precisionAtK: number[];
  averagePrecision: number;
}

export function EvaluationComponent() {
  const [selectedTest, setSelectedTest] = useState<string>(testSet[0].id);
  const [, setResults] = useState<TestResult | null>(null);
  const [allResults, setAllResults] = useState<{[key: string]: TestResult}>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [meanRecall, setMeanRecall] = useState<number | null>(null);
  const [mapAtK, setMapAtK] = useState<number | null>(null);
  
  // Calculate Precision at k
  const calculatePrecisionAtK = (relevantRetrieved: number, k: number): number => {
    return relevantRetrieved / k;
  };
  
  // Calculate Average Precision
  const calculateAveragePrecision = (precisionAtK: number[], matches: string[], k: number): number => {
    // Only consider positions where we have matches (relevant items)
    const relevantPrecisions = precisionAtK.filter((_, i) => i < k && i < matches.length);
    
    if (relevantPrecisions.length === 0) return 0;
    
    // Calculate sum of precision at each relevant position
    const sumPrecision = relevantPrecisions.reduce((sum, precision) => sum + precision, 0);
    
    // Divide by min(k, total relevant items)
    return sumPrecision / Math.min(k, matches.length);
  };
  
  const evaluateQuery = async (testCase: typeof testSet[0]) => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the API with the test query
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: testCase.query }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return null;
      }
      
      // Extract the assessment names from the recommendations
      const actualAssessments = data.recommendations.map((rec: Recommendation) => rec.name);
      const k = actualAssessments.length;
      
      // Find matches, missing, and extra assessments
      const matches = testCase.expectedAssessments.filter(expected => 
        actualAssessments.some((actual: string) => actual.includes(expected))
      );
      
      const missing = testCase.expectedAssessments.filter(expected => 
        !actualAssessments.some((actual: string) => actual.includes(expected))
      );
      
      const extra = actualAssessments.filter((actual: string) => 
        !testCase.expectedAssessments.some(expected => actual.includes(expected))
      );
      
      // Calculate Recall@K
      const recall = matches.length / testCase.expectedAssessments.length;
      
      // Calculate Precision@k at each position
      const precisionAtK = Array(k).fill(0).map((_, i) => {
        const topK = actualAssessments.slice(0, i + 1);
        const relevantInTopK = testCase.expectedAssessments.filter(expected => 
          topK.some((item: string) => item.includes(expected))
        ).length;
        return calculatePrecisionAtK(relevantInTopK, i + 1);
      });
      
      // Calculate Average Precision
      const averagePrecision = calculateAveragePrecision(precisionAtK, matches, k);
      
      // Create result object
      const result = {
        query: testCase.query,
        expectedAssessments: testCase.expectedAssessments,
        actualAssessments,
        matches,
        missing,
        extra,
        recall,
        precisionAtK,
        averagePrecision
      };
      
      return result;
    } catch (error) {
      console.error('Error during evaluation:', error);
      setError('An error occurred during evaluation. Please try again.');
      return null;
    }
  };
  
  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Find the selected test case
      const testCase = testSet.find(test => test.id === selectedTest);
      
      if (!testCase) {
        setError('Test case not found.');
        setLoading(false);
        return;
      }
      
      const result = await evaluateQuery(testCase);
      if (result) {
        setResults(result);
        
        // Update allResults with the new result
        const updatedResults = { ...allResults, [selectedTest]: result };
        setAllResults(updatedResults);
        
        // Calculate mean metrics if we have results for all test cases
        if (Object.keys(updatedResults).length === testSet.length) {
          // Calculate Mean Recall@K
          const totalRecall = Object.values(updatedResults).reduce(
            (sum, result) => sum + result.recall,
            0
          );
          setMeanRecall(totalRecall / testSet.length);
          
          // Calculate MAP@K
          const totalAP = Object.values(updatedResults).reduce(
            (sum, result) => sum + result.averagePrecision,
            0
          );
          setMapAtK(totalAP / testSet.length);
        }
      }
    } catch (error) {
      console.error('Error running evaluation:', error);
      setError('An error occurred during evaluation. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const runAllEvaluations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newResults: {[key: string]: TestResult} = {};
      
      // Evaluate each test case sequentially
      for (const testCase of testSet) {
        const result = await evaluateQuery(testCase);
        if (result) {
          newResults[testCase.id] = result;
        }
      }
      
      setAllResults(newResults);
      
      // Set the results for the currently selected test
      const currentTest = newResults[selectedTest];
      if (currentTest) {
        setResults(currentTest);
      }
      
      // Calculate mean metrics
      const resultsArray = Object.values(newResults);
      if (resultsArray.length > 0) {
        // Calculate Mean Recall@K
        const totalRecall = resultsArray.reduce(
          (sum, result) => sum + result.recall,
          0
        );
        setMeanRecall(totalRecall / resultsArray.length);
        
        // Calculate MAP@K
        const totalAP = resultsArray.reduce(
          (sum, result) => sum + result.averagePrecision,
          0
        );
        setMapAtK(totalAP / resultsArray.length);
      }
    } catch (error) {
      console.error('Error running all evaluations:', error);
      setError('An error occurred during evaluation. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (value: string) => {
    setSelectedTest(value);
    // If we already have results for this test, show them
    if (allResults[value]) {
      setResults(allResults[value]);
    } else {
      setResults(null);
    }
  };
  
  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">System Evaluation</CardTitle>
        <CardDescription>
          Compare system recommendations against benchmark queries across different job roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6 justify-between items-center">
          <div>
            <Button
              onClick={runEvaluation}
              disabled={loading}
              className="mr-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>Run Current Evaluation</>
              )}
            </Button>
            <Button
              onClick={runAllEvaluations}
              disabled={loading}
              variant="outline"
            >
              Evaluate All Queries
            </Button>
          </div>
          
          {meanRecall !== null && mapAtK !== null && (
            <div className="flex gap-4">
              <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-sm">
                Mean Recall@K: {meanRecall.toFixed(2)}
              </Badge>
              <Badge className="bg-green-100 text-green-800 px-3 py-1 text-sm">
                MAP@K: {mapAtK.toFixed(2)}
              </Badge>
            </div>
          )}
        </div>
        
        <Tabs defaultValue={selectedTest} onValueChange={handleTabChange}>
          <TabsList className="mb-4 w-full flex overflow-x-auto">
            {testSet.map(test => (
              <TabsTrigger key={test.id} value={test.id} className="flex-1 whitespace-nowrap">
                {test.id === "java-dev" ? "Java Developer" : 
                 test.id === "sales-role" ? "Sales Role" : 
                 test.id === "coo-china" ? "COO (China)" :
                 test.id === "content-writer" ? "Content Writer" :
                 test.id === "bank-admin" ? "Bank Admin" : test.id}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {testSet.map(test => (
            <TabsContent key={test.id} value={test.id}>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">Query:</p>
                <p className="text-sm bg-gray-50 p-3 rounded-md border border-gray-200">
                  {test.query}
                </p>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700 font-medium">Error</p>
                  </div>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              )}
              
              {allResults[test.id] && (
                <div className="border border-gray-200 rounded-md p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2">Performance Summary</h3>
                    <div className="flex flex-wrap gap-3">
                      <Badge className={allResults[test.id].recall > 0.7 ? "bg-green-100 text-green-800" : allResults[test.id].recall > 0.4 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                        Recall@K: {allResults[test.id].recall.toFixed(2)}
                      </Badge>
                      <Badge className={allResults[test.id].averagePrecision > 0.7 ? "bg-green-100 text-green-800" : allResults[test.id].averagePrecision > 0.4 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                        AP@K: {allResults[test.id].averagePrecision.toFixed(2)}
                      </Badge>
                      <div className="text-sm text-gray-500">
                        Matched: {allResults[test.id].matches.length}/{allResults[test.id].expectedAssessments.length}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Matched Assessments:</h4>
                      <div className="bg-green-50 rounded-md p-3 max-h-40 overflow-y-auto">
                        {allResults[test.id].matches.length > 0 ? (
                          <ul className="space-y-1">
                            {allResults[test.id].matches.map((match, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{match}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No matched assessments</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Missing Expected Assessments:</h4>
                      <div className="bg-amber-50 rounded-md p-3 max-h-40 overflow-y-auto">
                        {allResults[test.id].missing.length > 0 ? (
                          <ul className="space-y-1">
                            {allResults[test.id].missing.map((missing, index) => (
                              <li key={index} className="flex items-start">
                                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{missing}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No missing assessments</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Additional Assessments (not in benchmark):</h4>
                      <div className="bg-blue-50 rounded-md p-3 max-h-40 overflow-y-auto">
                        {allResults[test.id].extra.length > 0 ? (
                          <ul className="space-y-1">
                            {allResults[test.id].extra.map((extra, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-sm">{extra}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No additional assessments</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <CardFooter className="border-t pt-4 text-sm text-gray-500">
        Evaluation uses Mean Recall@K and MAP@K to measure recommendation quality across different domains
      </CardFooter>
    </Card>
  );
}