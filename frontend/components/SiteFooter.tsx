"use client";

import React from "react";
import { Mail, Linkedin, Twitter } from "lucide-react";
import Image from "next/image";

function FooterGroup({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={link}>
            <a
              href="#"
              className="transition-colors duration-150 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-10 px-6 py-14 md:px-10">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Image
              src="/images/learn-x-logo.svg"
              alt="Learn-X Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-slate-100">LEARN-X</span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed">
            Adaptive learning experiences that help every student master complex subjects faster.
          </p>
          <p className="text-xs font-medium text-slate-400">
            Adaptive Learning, Real Results
          </p>
        </div>

        {/* Product Links */}
        <FooterGroup 
          title="Product" 
          links={["Dashboard", "Study Plan", "Courses", "Help Center"]} 
        />

        {/* Resources Links */}
        <FooterGroup 
          title="Resources" 
          links={["Blog", "API Docs", "Educator Toolkit"]} 
        />

        {/* Legal Links */}
        <FooterGroup 
          title="Legal" 
          links={["Privacy Policy", "Terms of Service", "Acceptable Use", "Cookie Settings"]} 
        />

        {/* Social & Contact */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-100">Connect</h4>
          <div className="flex gap-4">
            {[
              { Icon: Linkedin, href: "#", label: "LinkedIn" },
              { Icon: Twitter, href: "#", label: "Twitter" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                className="transition-all duration-150 hover:text-white hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              <a 
                href="mailto:contact@learn-x.ai"
                className="hover:text-white transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
              >
                contact@learn-x.ai
              </a>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              🇺🇸 EST USA
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Learn-X Inc. · Made with ☕ in USA
      </div>
    </footer>
  );
}