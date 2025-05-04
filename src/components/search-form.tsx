import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { SearchIcon, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// Define form schema
const formSchema = z.object({
  query: z.string().min(10, {
    message: "Your query should be at least 10 characters to get meaningful recommendations.",
  }),
});

interface SearchFormProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  // Example queries to help users get started
  const exampleQueries = [
    "I am hiring for Java developers who can also collaborate effectively with my business teams. Looking for an assessment(s) that can be completed in 40 minutes.",
    "Looking to hire mid-level professionals who are proficient in Python, SQL and JavaScript. Need an assessment package that can test all skills with max duration of 60 minutes.",
    "Here is a JD text for a technical project manager role, can you recommend some assessment that can help me screen applications. Time limit is less than 30 minutes.",
    "I am hiring for an analyst and wants applications to screen using Cognitive and personality tests, what options are available within 45 mins."
  ];
  
  // Form definition
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      query: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSearch(values.query);
  };

  // Function to set example query
  const useExampleQuery = (query: string) => {
    form.setValue("query", query);
  };

  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">SHL Assessment Finder</CardTitle>
        <CardDescription>
          Describe your hiring needs and requirements to get tailored assessment recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Describe who you're hiring for, specific skills needed, time constraints, etc."
                      className="resize-none h-36"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-sm text-gray-500 font-medium">Example queries:</p>
                <div className="space-y-1">
                  {exampleQueries.map((query, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => useExampleQuery(query)}
                      className="text-xs text-blue-600 hover:text-blue-800 block max-w-lg truncate text-left"
                    >
                      "{query.substring(0, 60)}..."
                    </button>
                  ))}
                </div>
              </div>
              <Button 
                type="submit" 
                className="px-6" 
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <SearchIcon className="mr-2 h-4 w-4" />
                    Find Assessments
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}