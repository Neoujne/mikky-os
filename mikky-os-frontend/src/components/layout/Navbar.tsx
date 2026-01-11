/**
 * Navbar - Public Navigation Component
 * Floating navigation for landing page and public pages
 */

import { Link, useLocation } from 'react-router-dom';
import { SignUpButton, SignInButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const navLinks = [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '/blog' },
];

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Handle smooth scroll for hash links
    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (href.startsWith('/#')) {
            e.preventDefault();
            const targetId = href.substring(2);

            // If we're not on home page, navigate first
            if (location.pathname !== '/') {
                window.location.href = href;
                return;
            }

            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                    ? 'bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50 shadow-lg'
                    : 'bg-transparent'
                }`}
        >
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="font-heading font-bold text-2xl tracking-tighter text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        MIKKY OS
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={(e) => handleNavClick(e, link.href)}
                                className="text-zinc-400 hover:text-cyan-400 font-medium transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    {/* Desktop CTA Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <SignInButton mode="modal">
                            <Button
                                variant="ghost"
                                className="text-zinc-300 hover:text-cyan-400 font-medium"
                            >
                                Sign In
                            </Button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <Button className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                Get Started
                            </Button>
                        </SignUpButton>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-zinc-400 hover:text-cyan-400 p-2"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-zinc-800/50 animate-in slide-in-from-top-2 duration-200">
                        <nav className="flex flex-col gap-4 mb-6">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={(e) => handleNavClick(e, link.href)}
                                    className="text-zinc-400 hover:text-cyan-400 font-medium py-2 transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                        <div className="flex flex-col gap-3">
                            <SignInButton mode="modal">
                                <Button
                                    variant="outline"
                                    className="w-full border-zinc-700 text-zinc-300"
                                >
                                    Sign In
                                </Button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold">
                                    Get Started
                                </Button>
                            </SignUpButton>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
