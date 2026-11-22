import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Clock3, Search, ShieldCheck, Sparkles, Stethoscope, X } from 'lucide-react';
import { ARTICLES, CATEGORIES, type Article } from '../content/learn';
import { Card, EmptyState, PageHeader, SectionTitle } from '../components/ui';

function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  return (
    <div className="article-view">
      <button className="text-link back-link" onClick={onBack}>← Back to all topics</button>
      <Card className="article-card">
        <div className="article-head">
          <span className="article-category">{article.category}</span>
          <h1>{article.title}</h1>
          <div className="article-meta"><Clock3 size={15} /> {article.readTime} <span>·</span> <ShieldCheck size={15} /> Written in plain language</div>
        </div>
        <p className="article-intro">{article.intro}</p>
        <div className="article-key-points">
          <h3><Sparkles size={17} /> In a nutshell</h3>
          <ul>{article.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </div>
        {article.sections.map((section) => <section className="article-section" key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
        <div className="article-disclaimer">
          <Stethoscope size={18} />
          <p>This content is for general education and does not replace personal medical advice. If you have concerns about your health, speak with a qualified healthcare professional.</p>
        </div>
      </Card>
    </div>
  );
}

export default function LearnPage() {
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Article | null>(null);

  const filtered = useMemo(() => ARTICLES.filter((a) =>
    (category === 'All' || a.category === category)
    && (query.trim() === '' || `${a.title} ${a.intro} ${a.sections.map((s) => s.heading + s.body).join(' ')}`.toLowerCase().includes(query.toLowerCase())),
  ), [category, query]);

  if (active) return <div className="page learn-page"><ArticleView article={active} onBack={() => setActive(null)} /></div>;

  return (
    <div className="page learn-page">
      <PageHeader eyebrow="Knowledge is care" title="Learn about your cycle" subtitle="Clear, compassionate information to help you understand your body." />

      <Card className="learn-hero">
        <div><span className="learn-hero-icon"><BookOpen size={26} /></span><h2>A little understanding goes a long way</h2><p>Explore honest, jargon-light guidance written to help you feel more confident about your health.</p></div>
        <div className="learn-hero-decor">✿</div>
      </Card>

      <div className="learn-controls">
        <div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topics…" />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}</div>
        <div className="category-tabs">{CATEGORIES.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
      </div>

      {filtered.length ? <div className="article-grid">
        {filtered.map((article) => (
          <button className="article-tile" key={article.id} onClick={() => setActive(article)}>
            <div className="article-tile-top"><span className="article-category">{article.category}</span><span className="article-read"><Clock3 size={13} /> {article.readTime}</span></div>
            <h3>{article.title}</h3>
            <p>{article.intro}</p>
            <span className="article-cta">Read article <ChevronRight size={15} /></span>
          </button>
        ))}
      </div> : <Card><EmptyState icon={<Search size={22} />} title="No topics found" description="Try a different search term or category." /></Card>}

      <div className="learn-note"><ShieldCheck size={17} /> All articles are for education only and are not a substitute for advice from a healthcare professional.</div>
    </div>
  );
}
