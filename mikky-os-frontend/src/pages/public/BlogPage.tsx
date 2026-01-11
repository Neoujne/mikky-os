/**
 * Blog Page - Blog Listing
 * Grid of blog posts with dummy content
 */

import { Navbar } from '@/components/layout';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight } from 'lucide-react';

const blogPosts = [
    {
        id: 1,
        title: 'Introducing Mikky OS: AI-Powered Pentesting',
        excerpt: 'We\'re excited to announce Mikky OS, a revolutionary approach to security testing that combines Docker isolation with AI intelligence.',
        date: '2026-01-10',
        author: 'Mikky Team',
        tags: ['Announcement', 'AI'],
        gradient: 'from-cyan-500 to-purple-500',
    },
    {
        id: 2,
        title: 'How DeepSeek R1 Transforms Vulnerability Analysis',
        excerpt: 'Deep dive into how we use DeepSeek\'s reasoning capabilities to provide context-aware security insights.',
        date: '2026-01-08',
        author: 'Security Team',
        tags: ['AI', 'Technical'],
        gradient: 'from-purple-500 to-pink-500',
    },
    {
        id: 3,
        title: 'The 9-Stage Scanning Pipeline Explained',
        excerpt: 'From info gathering to vulnerability scanning—a comprehensive look at our full reconnaissance workflow.',
        date: '2026-01-05',
        author: 'Engineering',
        tags: ['Technical', 'Guide'],
        gradient: 'from-pink-500 to-orange-500',
    },
    {
        id: 4,
        title: 'Docker Security Best Practices',
        excerpt: 'Learn how we use ephemeral containers and strict isolation to ensure zero host contamination during scans.',
        date: '2026-01-03',
        author: 'DevOps Team',
        tags: ['Docker', 'Security'],
        gradient: 'from-orange-500 to-yellow-500',
    },
    {
        id: 5,
        title: 'Case Study: Enterprise Security Assessment',
        excerpt: 'How a Fortune 500 company used Mikky OS to identify and remediate critical vulnerabilities.',
        date: '2025-12-28',
        author: 'Mikky Team',
        tags: ['Case Study', 'Enterprise'],
        gradient: 'from-emerald-500 to-cyan-500',
    },
    {
        id: 6,
        title: 'Getting Started with Security Headers',
        excerpt: 'Why security headers matter and how Mikky OS helps you identify missing protections.',
        date: '2025-12-20',
        author: 'Security Team',
        tags: ['Guide', 'Headers'],
        gradient: 'from-blue-500 to-purple-500',
    },
];

export function BlogPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-16">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-5xl md:text-6xl font-heading font-bold tracking-tighter mb-4">
                            Blog
                        </h1>
                        <p className="text-xl text-zinc-400">
                            Security insights, product updates, and technical deep-dives
                        </p>
                    </div>
                </div>
            </section>

            {/* Blog Grid */}
            <section className="pb-24">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {blogPosts.map((post) => (
                            <article
                                key={post.id}
                                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-700 transition-all duration-300"
                            >
                                {/* Featured Image */}
                                <div className={`h-48 bg-gradient-to-br ${post.gradient} relative`}>
                                    <div className="absolute inset-0 bg-zinc-950/40 group-hover:bg-zinc-950/20 transition-colors" />
                                    <div className="absolute bottom-4 left-4">
                                        <div className="flex gap-2">
                                            {post.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-1 bg-zinc-950/60 backdrop-blur-sm rounded text-xs font-mono text-zinc-300"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <h2 className="text-xl font-heading font-bold mb-3 text-zinc-100 group-hover:text-cyan-400 transition-colors">
                                        {post.title}
                                    </h2>
                                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                                        {post.excerpt}
                                    </p>

                                    {/* Meta */}
                                    <div className="flex items-center justify-between text-xs text-zinc-500">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(post.date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {post.author}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Read More */}
                                    <button className="mt-4 flex items-center gap-2 text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors">
                                        Read More
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* Pagination Placeholder */}
                    <div className="mt-12 text-center">
                        <p className="text-zinc-600 text-sm font-mono">
                            Page 1 of 1 • More posts coming soon
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800 bg-zinc-950 py-8">
                <div className="container mx-auto px-6 max-w-7xl text-center text-sm text-zinc-600">
                    <Link to="/" className="text-cyan-400 hover:text-cyan-300">MIKKY OS</Link> © 2026
                </div>
            </footer>
        </div>
    );
}
