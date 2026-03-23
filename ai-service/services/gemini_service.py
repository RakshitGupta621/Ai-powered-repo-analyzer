"""
Gemini service — LLM generation only.
Embeddings are handled by embedding_service.py
"""

import asyncio
import logging
from typing import Any

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable

from config import settings
from services.embedding_service import get_embeddings, get_query_embedding

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)
_llm_model = genai.GenerativeModel(settings.GEMINI_LLM_MODEL)

# Re-export so vector_service imports still work
__all__ = ["get_embeddings", "get_query_embedding", "generate_answer"]


SYSTEM_PROMPT = """You are an expert software engineer helping a developer understand a codebase.
You are given relevant code snippets retrieved from the codebase and a question.

Rules:
- Answer based ONLY on the provided code context.
- Be specific: reference file paths, function names, and line numbers when relevant.
- If the context is insufficient to answer fully, say so clearly.
- Format code references as `file_path:line_number`.
- Use markdown formatting for clarity.
- Keep answers focused and actionable."""


async def generate_answer(
    question: str,
    code_chunks: list[dict[str, Any]],
    chat_history: list[dict] | None = None,
) -> str:
    context = _format_context(code_chunks)
    prompt = _build_prompt(question, context, chat_history)

    for attempt in range(3):
        try:
            response = await asyncio.to_thread(
                _llm_model.generate_content,
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=2048,
                ),
            )
            return response.text
        except ResourceExhausted:
            wait = 2 ** attempt
            logger.warning(f"LLM rate limit, retrying in {wait}s")
            await asyncio.sleep(wait)
        except ServiceUnavailable:
            raise RuntimeError("AI service temporarily unavailable. Please try again.")

    raise RuntimeError("LLM generation failed after retries")


def _format_context(chunks: list[dict[str, Any]]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(
            f"### Snippet {i}: `{chunk['file_path']}` "
            f"(lines {chunk.get('start_line','?')}–{chunk.get('end_line','?')})\n"
            f"```{chunk.get('language','')}\n{chunk['content']}\n```"
        )
    return "\n\n".join(parts)


def _build_prompt(question: str, context: str, chat_history: list[dict] | None) -> str:
    history_block = ""
    if chat_history:
        turns = [
            f"**{t.get('role','user').upper()}**: {t['content']}"
            for t in chat_history[-4:]
        ]
        history_block = "\n\n## Previous Conversation\n" + "\n".join(turns)

    return f"""{SYSTEM_PROMPT}

## Retrieved Code Context
{context}
{history_block}

## Developer Question
{question}

## Your Answer
"""
