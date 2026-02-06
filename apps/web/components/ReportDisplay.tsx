"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Download, Share2, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

export function ReportDisplay({ report }: { report: any }) {
  const [shareCopied, setShareCopied] = useState(false);

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const downloadPdf = () => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    // In emulator, functions run on 5001. We need to point to the API.
    // The frontend usually knows its API URL via env or hardcoded.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5099/gmb-audit-generator/us-central1/api';
    window.location.href = `${apiUrl}/report/${report.id}/pdf`;
  };

  return (
    <div className="space-y-10">
      {/* Brand Logo */}
      <div className="flex justify-start">
        <img 
          src="https://ik.imagekit.io/rgqefde41/Gemini_Generated_Image_xxxfi3xxxfi3xxxf.png?updatedAt=1770123148703" 
          alt="Nexo Logo" 
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Header Snapshot */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-bold text-gray-900">{report.normalizedPlace.name}</h2>
            <p className="text-gray-500">{report.normalizedPlace.address}</p>
          </div>
          
          <div className="flex gap-4">
            <ScoreCard label="Overall Score" value={report.overallScore} max={100} color="brand" />
            <ScoreCard label="Rating" value={report.normalizedPlace.rating || 0} max={5} color="emerald" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Metric label="Reviews" value={report.normalizedPlace.reviewsCount} />
          <Metric label="Status" value={report.normalizedPlace.businessStatus} />
          <Metric label="Phone" value={report.normalizedPlace.phone || 'N/A'} />
          <Metric label="Website" value={report.normalizedPlace.website ? 'Available' : 'Missing'} />
        </div>
      </div>

      {/* Subscores Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(report.subscores).map(([key, value]: any) => (
          <div key={key} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-1 font-semibold">{key}</div>
            <div className="text-xl font-bold text-gray-900">{value}/20</div>
          </div>
        ))}
      </div>

      {/* Main Report */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 prose prose-blue max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900 prose-li:marker:text-blue-500">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          rehypePlugins={[rehypeRaw]}
        >
          {report.reportMarkdown}
        </ReactMarkdown>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-8">
        <ActionButton icon={downloadPdf} label="Download PDF" LucideIcon={Download} primary />
        <ActionButton icon={copyShareLink} label={shareCopied ? "Link Copied!" : "Copy Share Link"} LucideIcon={shareCopied ? Check : Share2} />
        <a 
          href={report.normalizedPlace.googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" />
          Open Maps
        </a>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, max, color }: any) {
  const colors: any = {
    amber: "text-amber-600 border-amber-200 bg-amber-50",
    emerald: "text-green-600 border-green-200 bg-green-50",
    brand: "text-[#b49466] border-[#d7b27e]/30 bg-[#d7b27e]/5",
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex flex-col items-center justify-center shadow-sm`}>
      <div className="text-[10px] uppercase font-bold opacity-60 mb-1">{label}</div>
      <div className="text-3xl font-black">{value}<span className="text-sm opacity-50">/{max}</span></div>
    </div>
  );
}

function Metric({ label, value, mini }: any) {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 p-3 rounded-xl border border-gray-100">
      <div className="text-[10px] uppercase font-bold text-gray-400">{label}</div>
      <div className="font-bold text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-sm">{value}</div>
    </div>
  );
}

function ActionButton({ icon, label, LucideIcon, primary }: any) {
  return (
    <button
      onClick={icon}
      className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-sm ${
        primary ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
      }`}
    >
      <LucideIcon className="h-4 w-4" />
      {label}
    </button>
  );
}

