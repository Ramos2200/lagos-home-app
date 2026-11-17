import Link from "next/link";
import { FEEDBACK_URL } from "@/lib/beta";

export const metadata = { title: "Give feedback — IleLagos beta" };

const IDEAS = [
  "Was it easy to find a home that suits you?",
  "Were the costs (rent, fees, service charge) clear?",
  "Did anything confuse you, look broken or feel slow?",
  "What would make you trust a listing more?",
  "What's missing that you'd want before using IleLagos for real?",
];

/** Where testers go to send feedback. Uses the form link in lib/beta.ts once it's set. */
export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <p className="eyebrow">IleLagos beta</p>
      <h1 className="page-title mt-1">Thanks for testing IleLagos</h1>
      <p className="mt-2 text-[16px] text-ink-700">
        Your honest feedback shapes what we build next. The homes and people in the beta are samples, so try anything — search, save homes,
        request viewings, list a home — nothing is a real offer and nothing is sent outside the app.
      </p>

      <div className="card mt-6 p-5 sm:p-6">
        {FEEDBACK_URL ? (
          <>
            <h2 className="section-title">Send your feedback</h2>
            <p className="muted mt-1">It takes about 3 minutes. The form opens in a new tab.</p>
            <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4">
              Open the feedback form<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        ) : (
          <>
            <h2 className="section-title">Feedback form coming soon</h2>
            <p className="muted mt-1">
              For now, please send your thoughts to the person who shared IleLagos with you. A screenshot of anything confusing helps a lot.
            </p>
          </>
        )}
        <h3 className="mt-6 text-sm font-bold text-ink-900">Things worth telling us</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
          {IDEAS.map((q) => (
            <li key={q} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
              {q}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-sm text-ink-500">
        Please don&apos;t include passwords, bank details or ID numbers in feedback. <Link href="/" className="link">Back to IleLagos</Link>
      </p>
    </div>
  );
}
