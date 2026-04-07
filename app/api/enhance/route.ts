import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

export async function POST(request: Request) {
  try {
    const { bulletPoint } = await request.json();

    if (!bulletPoint || bulletPoint.trim().length < 5) {
      return NextResponse.json({ error: 'Please provide a valid bullet point to enhance.' }, { status: 400 });
    }

    if (!openai) {
      // Fallback logic for No-API mode
      const actionVerbs = ['Spearheaded', 'Engineered', 'Orchestrated', 'Optimized', 'Architected', 'Synthesized', 'Cultivated', 'Transformed'];
      const randomVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
      
      const enhanced = `${randomVerb} [Action] by utilizing [Method/Tool], resulting in [X]% improvement in [Metric] while [Context].`;
      
      return NextResponse.json({ 
        enhanced,
        isFallback: true,
        note: 'OpenAI API key missing. Providing a STAR-method template for manually polishing your bullet point.'
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume writer and career coach. Your task is to rewrite the user\'s bullet point using the STAR method (Situation, Task, Action, Result). Use powerful action verbs, be concise, and focus on achievements. If no metrics are provided, add placeholders like "[X%]" or "[Amount]" to remind the user to quantify their impact. Provide ONLY the enhanced bullet point, no conversational filler.'
        },
        {
          role: 'user',
          content: `Original bullet point: ${bulletPoint}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const enhanced = completion.choices[0]?.message?.content?.trim() || 'Could not enhance bullet point.';

    return NextResponse.json({ enhanced, isFallback: false });
  } catch (error: any) {
    console.error('Enhancement error:', error);
    return NextResponse.json({ error: 'Failed to enhance bullet point. Please try again.' }, { status: 500 });
  }
}
