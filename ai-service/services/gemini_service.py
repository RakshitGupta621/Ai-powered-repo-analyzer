"""Gemini LLM service for answer generation."""

import asyncio
import logging
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable
from typing import Any
from config import settings
from services.embedding_service import get_embeddings, get_query_embedding

logger = logging.getLogger(__name__)
genai.configure(api_key=settings.GEMINI_API_KEY)
llm_model = genai.GenerativeModel(settings.GEMINI_LLM_MODEL)

# Re-export embedding functions
__all__ = ["get_embeddings", "get_query_embedding", "generate_answer"]

SYSTEM_PROMPT = """You are a software engineer explaining code.
- Answer ONLY from provided code.
- Reference files, functions, and line numbers.
- Use markdown formatting.
- If context insufficient, say so."""


async def generate_answer(
    question: str,
    code_chunks: list[dict[str, Any]],
    chat_history: list[dict] | None = None,
) -> str:
    """Generate answer using Gemini LLM with retrieved code context."""
    context = "\n\n".join([
        f"### Snippet {i+1}: `{c['file_path']}` (lines {c.get('start_line','?')}–{c.get('end_line','?')})\n"
        f"```{c.get('language','')}\n{c['content']}\n```"
        for i, c in enumerate(code_chunks)
    ])
    
    history = ""
    if chat_history:
        history = "\n\n## Previous Conversation\n" + "\n".join([
            f"**{t.get('role','USER').upper()}**: {t['content']}"
            for t in chat_history[-4:]
        ])
    
    prompt = f"""{SYSTEM_PROMPT}

## Code Context
{context}
{history}

## Question
{question}

## Answer"""
    
    for attempt in range(3):
        try:
            response = await asyncio.to_thread(
                llm_model.generate_content,
                prompt,
                generation_config=genai.GenerationConfig(temperature=0.2, max_output_tokens=2048)
            )
            return response.text
        except ResourceExhausted:
            wait = 2 ** attempt
            logger.warning(f"Rate limit, retrying in {wait}s")
            await asyncio.sleep(wait)
        except ServiceUnavailable:
            raise RuntimeError("Service temporarily unavailable")
    
    raise RuntimeError("LLM generation failed after retries")
