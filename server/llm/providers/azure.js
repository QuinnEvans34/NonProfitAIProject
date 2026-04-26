// Azure OpenAI provider for the structured analyzer. Not yet implemented.

/*
 * When implementing, the call will look roughly like:
 *
 *   const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
 *   const res = await client.chat.completions.create({
 *     model: process.env.AZURE_OPENAI_DEPLOYMENT,
 *     response_format: {
 *       type: 'json_schema',
 *       json_schema: { name: 'AnalysisResult', schema: jsonSchema, strict: true },
 *     },
 *     temperature: 0.2,
 *     messages: [
 *       { role: 'system', content: systemPrompt },
 *       { role: 'user',   content: userPrompt },
 *     ],
 *   });
 *   return res.choices[0].message.content;
 */

export async function generateAnalysis(/* { systemPrompt, userPrompt, jsonSchema } */) {
  throw new Error('azure provider not yet implemented; set LLM_PROVIDER=ollama or implement this file');
}
