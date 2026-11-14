// =====================================================================
// BlogViews.tsx - Blog SEO (lista + articolo con JSON-LD Article)
// =====================================================================
"use client";

import { Button } from "@/components/ui/button";
import { Breadcrumbs, SectionHeading, JsonLd } from "@/components/site/bits";
import { useT, useContent, useRoute } from "@/lib/store";
import { CalendarDays, Clock3, ArrowLeft, Tag } from "lucide-react";

function renderMarkdown(md: string): React.ReactNode[] {
  const blocks = md.split(/\n\n+/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-10 text-xl font-bold tracking-tight sm:text-2xl">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith("1. ") || /^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^\d+\./.test(l.trim()));
      return (
        <ol key={i} className="mt-4 list-decimal space-y-2.5 pl-5 text-[15px] leading-relaxed text-muted-foreground">
          {items.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: l.replace(/^\d+\.\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          ))}
        </ol>
      );
    }
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").filter((l) => l.trim().startsWith("- "));
      return (
        <ul key={i} className="mt-4 list-disc space-y-2 pl-5">
          {items.map((l, j) => (
            <li key={j}>{l.replace(/^-\s*/, "")}</li>
          ))}
        </ul>
      );
    }
    return (
      <p
        key={i}
        className="mt-4 text-[15px] leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
      />
    );
  });
}

export function BlogView() {
  const t = useT();
  const { blog } = useContent();
  const navigate = useRoute((s) => s.navigate);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.blog") }]} />
      <SectionHeading
        overline={t("nav.blog")}
        title={t("nav.blog")}
        subtitle="Nutrizione, sicurezza alimentare e territorio: articoli che servono, non riempitivi."
      />
      <div className="grid gap-6 sm:grid-cols-2">
        {blog.map((post) => (
          <article
            key={post.id}
            className="paper-card group cursor-pointer overflow-hidden"
            onClick={() => navigate(`/blog/${post.slug}`)}
          >
            {post.coverUrl && (
               
              <img
                src={post.coverUrl}
                alt={post.title}
                width={600}
                height={340}
                loading="lazy"
                className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            )}
            <div className="p-5">
              <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-semibold text-secondary-foreground">
                  <Tag className="h-3 w-3" aria-hidden /> {post.category}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {new Date(post.publishedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden /> {post.readMinutes} min
                </span>
              </p>
              <h2 className="mt-3 text-lg font-bold leading-snug group-hover:text-primary">{post.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function BlogPostView({ slug }: { slug: string }) {
  const t = useT();
  const { blog } = useContent();
  const navigate = useRoute((s) => s.navigate);
  const post = blog.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="section-title">Articolo non trovato</h1>
        <Button className="mt-6" onClick={() => navigate("/blog")}>{t("nav.blog")}</Button>
      </div>
    );
  }

  const others = blog.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.blog"), path: "/blog" }, { label: post.title }]} />

      <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-semibold text-secondary-foreground">
          <Tag className="h-3 w-3" aria-hidden /> {post.category}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {new Date(post.publishedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" aria-hidden /> {post.readMinutes} min di lettura
        </span>
      </p>

      <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>

      {post.coverUrl && (
         
        <img
          src={post.coverUrl}
          alt={post.title}
          width={1200}
          height={675}
          className="mt-8 aspect-[16/9] w-full rounded-2xl border border-border object-cover shadow-lg"
        />
      )}

      <div className="mt-8">{renderMarkdown(post.content)}</div>

      <p className="mt-10 border-t border-border pt-5 text-sm text-muted-foreground">
        Scritto da <b>{post.author}</b> · {post.category}
      </p>

      <Button variant="outline" className="mt-8 gap-2" onClick={() => navigate("/blog")}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("nav.blog")}
      </Button>

      {others.length > 0 && (
        <div className="mt-12">
          <h2 className="text-base font-bold">Continua a leggere</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {others.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/blog/${p.slug}`)}
                className="paper-card p-4 text-left transition-colors hover:border-primary/40"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">{p.category}</p>
                <p className="mt-1.5 font-bold leading-snug">{p.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          image: post.coverUrl ?? undefined,
          datePublished: post.publishedAt,
          author: { "@type": "Organization", name: post.author },
          publisher: {
            "@type": "Organization",
            name: "La Schiscetta",
          },
        }}
      />
    </article>
  );
}
