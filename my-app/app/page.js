export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm w-full">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center"
            style={{ boxShadow: '0 4px 24px 0 rgba(147, 51, 234, 0.25)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
        </div>

        {/* Card */}
        <div
          className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border border-purple-100"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            boxShadow: '0 8px 40px 0 rgba(147, 51, 234, 0.18), 0 2px 8px 0 rgba(147, 51, 234, 0.10)',
          }}
        >
          <p
            className="text-xs font-semibold tracking-[0.2em] text-purple-500 uppercase mb-2"
            style={{ fontFamily: "'Helvetica Neue', Helvetica, sans-serif" }}
          >
            Your Reading Hub
          </p>
          <h1 className="text-3xl font-bold text-stone-900 mb-3 leading-tight">
            The&nbsp;Article<br />
            <span className="italic font-normal text-purple-400">Library</span>
          </h1>
          <p
            className="text-stone-500 mb-7 text-sm leading-relaxed"
            style={{ fontFamily: "'Helvetica Neue', Helvetica, sans-serif" }}
          >
            Discover, read, and share curated articles — all in one place.
          </p>

          <div className="flex flex-col gap-3">
            <a href="/login">
              <button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 text-sm tracking-wide"
                style={{
                  fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
                  boxShadow: '0 4px 16px 0 rgba(147, 51, 234, 0.35)',
                }}
              >
                Log In
              </button>
            </a>
            <a href="/admin-login">
              <button
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2.5 px-4 rounded-xl transition duration-200 border border-purple-200 text-sm tracking-wide"
                style={{ fontFamily: "'Helvetica Neue', Helvetica, sans-serif" }}
              >
                Admin Portal
              </button>
            </a>
          </div>
        </div>

        {/* Footer note */}
        <p
          className="mt-5 text-xs text-white/60"
          style={{ fontFamily: "'Helvetica Neue', Helvetica, sans-serif" }}
        >
          Powered by Supabase &amp; Vercel
        </p>
      </div>
    </div>
  );
}