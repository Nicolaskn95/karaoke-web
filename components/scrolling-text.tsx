"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollingTextProps {
  children: string;
  className?: string;
  /** Aplicar scroll apenas em telas menores que este breakpoint (em pixels) */
  mobileBreakpoint?: number;
}

export default function ScrollingText({
  children,
  className = "",
  mobileBreakpoint = 768, // md breakpoint do Tailwind
}: ScrollingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (!containerRef.current || !textRef.current) return;

      const container = containerRef.current;
      const text = textRef.current;
      const isMobile = window.innerWidth < mobileBreakpoint;

      // Temporariamente remove truncate para medir o tamanho real do texto
      const currentClasses = text.className;
      text.className = "whitespace-nowrap inline-block";

      // Força um reflow para garantir que as medidas estejam corretas
      void text.offsetWidth;

      const textWidth = text.scrollWidth;
      const containerWidth = container.clientWidth;

      // Restaura as classes
      text.className = currentClasses;

      // Verifica se o texto está truncado
      const textIsTruncated = textWidth > containerWidth;

      setIsTruncated(textIsTruncated);
      // Aplica scroll apenas em mobile E se estiver truncado
      setShouldScroll(isMobile && textIsTruncated);
    };

    // Verifica imediatamente
    checkTruncation();

    // Verifica quando a janela é redimensionada
    window.addEventListener("resize", checkTruncation);

    // Verifica quando o conteúdo muda (pode haver delay no render)
    const timeoutId = setTimeout(checkTruncation, 100);
    const timeoutId2 = setTimeout(checkTruncation, 300); // Verifica novamente após render completo

    return () => {
      window.removeEventListener("resize", checkTruncation);
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [children, mobileBreakpoint]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{
        minWidth: 0,
      }}
    >
      <span
        ref={textRef}
        className={`whitespace-nowrap ${
          shouldScroll
            ? "inline-block animate-scroll-text-marquee"
            : isTruncated
            ? "block truncate"
            : "inline-block"
        }`}
      >
        {shouldScroll ? (
          <>
            {children}
            <span className="inline-block ml-8">{children}</span>
          </>
        ) : (
          children
        )}
      </span>
    </div>
  );
}
