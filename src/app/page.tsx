import Link from 'next/link'

export default function Home() {
  return (
    <div className="py-3xl">
      
      {/* Hero Section */}
      <section className="container text-center mb-3xl">
        <div className="mb-xl">
          <div className="mb-lg">
            <span className="text-5xl mb-sm block">🎙️</span>
            <h1 className="text-5xl font-bold text-primary mb-md">ScoreSpoken</h1>
            <p className="text-xl text-secondary">AI-Powered IELTS Speaking Practice</p>
          </div>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Practice with real IELTS questions and receive instant, detailed feedback 
            from our advanced AI system.
          </p>
        </div>
        
        <div className="flex justify-center gap-md mb-xl">
          <Link href="/quick-drill" className="btn btn-primary">
            Start Quick Practice
          </Link>
          <Link href="#practice-modes" className="btn btn-secondary">
            Explore Modes
          </Link>
        </div>
        
        <div className="flex justify-center items-center gap-xl text-sm text-muted">
          <div className="flex items-center gap-xs">
            <span className="status-indicator status-success">✓</span>
            <span>No signup required</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="status-indicator status-success">✓</span>
            <span>Instant feedback</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="status-indicator status-success">✓</span>
            <span>Free to use</span>
          </div>
        </div>
      </section>

      {/* Practice Modes */}
      <section id="practice-modes" className="container mb-3xl">
        <div className="text-center mb-2xl">
          <h2 className="text-3xl font-bold text-primary mb-md">Choose Your Practice Mode</h2>
          <p className="text-lg text-secondary">
            Each mode targets specific IELTS speaking skills with tailored feedback.
          </p>
        </div>
        
        <div className="grid grid-cols-auto gap-lg">
          
          {/* Quick Drill */}
          <Link href="/quick-drill" className="card card-clickable">
            <div className="flex items-start justify-between mb-lg">
              <div className="text-4xl">⚡</div>
              <span className="status-indicator status-success">Most Popular</span>
            </div>
            <h3 className="text-xl font-semibold text-primary mb-sm">Quick Drill</h3>
            <p className="text-sm text-muted mb-md">Single Question Practice</p>
            <p className="text-secondary mb-lg">
              Perfect for quick practice sessions. Answer one IELTS-style question 
              and get instant AI feedback.
            </p>
            <div className="flex gap-md text-sm text-muted mb-lg">
              <span>1 question</span>
              <span>•</span>
              <span>2-3 minutes</span>
              <span>•</span>
              <span>Instant results</span>
            </div>
            <div className="btn btn-primary w-full">Start Quick Practice</div>
          </Link>

          {/* Part 1 Drill */}
          <Link href="/part1-drill" className="card card-clickable">
            <div className="flex items-start justify-between mb-lg">
              <div className="text-4xl">👤</div>
              <span className="status-indicator">Beginner</span>
            </div>
            <h3 className="text-xl font-semibold text-primary mb-sm">Part 1 Drill</h3>
            <p className="text-sm text-muted mb-md">Personal Questions</p>
            <p className="text-secondary mb-lg">
              Practice the interview section with 5 personal questions about 
              yourself, work, and interests.
            </p>
            <div className="flex gap-md text-sm text-muted mb-lg">
              <span>5 questions</span>
              <span>•</span>
              <span>4-5 minutes</span>
              <span>•</span>
              <span>Personal topics</span>
            </div>
            <div className="btn btn-primary w-full">Start Part 1 Practice</div>
          </Link>

          {/* Part 2 Drill */}
          <Link href="/part2-drill" className="card card-clickable">
            <div className="flex items-start justify-between mb-lg">
              <div className="text-4xl">📝</div>
              <span className="status-indicator status-warning">Challenging</span>
            </div>
            <h3 className="text-xl font-semibold text-primary mb-sm">Part 2 Drill</h3>
            <p className="text-sm text-muted mb-md">Cue Card Task</p>
            <p className="text-secondary mb-lg">
              Individual long turn with cue card. 1 minute to prepare, 
              then speak for 2 minutes continuously.
            </p>
            <div className="flex gap-md text-sm text-muted mb-lg">
              <span>Prep + speak</span>
              <span>•</span>
              <span>3-4 minutes</span>
              <span>•</span>
              <span>Sustained speech</span>
            </div>
            <div className="btn btn-primary w-full">Start Part 2 Practice</div>
          </Link>

        </div>
      </section>

      {/* Additional Practice Modes */}
      <section className="container mb-3xl">
        <div className="grid grid-cols-auto gap-lg">
          
          {/* Part 3 Drill */}
          <Link href="/part3-drill" className="card card-clickable">
            <div className="flex items-start justify-between mb-lg">
              <div className="text-4xl">💭</div>
              <span className="status-indicator">Advanced</span>
            </div>
            <h3 className="text-xl font-semibold text-primary mb-sm">Part 3 Drill</h3>
            <p className="text-sm text-muted mb-md">Discussion Questions</p>
            <p className="text-secondary mb-lg">
              Abstract discussion questions requiring analytical thinking 
              and complex opinions.
            </p>
            <div className="flex gap-md text-sm text-muted mb-lg">
              <span>5 questions</span>
              <span>•</span>
              <span>4-5 minutes</span>
              <span>•</span>
              <span>Abstract topics</span>
            </div>
            <div className="btn btn-primary w-full">Start Part 3 Practice</div>
          </Link>

          {/* Coming Soon: Full Mock Test */}
          <div className="card" style={{ opacity: 0.7 }}>
            <div className="flex items-start justify-between mb-lg">
              <div className="text-4xl" style={{ opacity: 0.5 }}>🎯</div>
              <span className="status-indicator">Coming Soon</span>
            </div>
            <h3 className="text-xl font-semibold text-muted mb-sm">Full Mock Test</h3>
            <p className="text-sm text-muted mb-md">Complete IELTS Experience</p>
            <p className="text-muted mb-lg">
              Complete IELTS Speaking test with all three parts in sequence, 
              just like the real exam.
            </p>
            <div className="flex gap-md text-sm text-muted mb-lg">
              <span>All 3 parts</span>
              <span>•</span>
              <span>11-14 minutes</span>
              <span>•</span>
              <span>Real exam flow</span>
            </div>
            <div className="btn btn-secondary w-full" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Coming Soon
            </div>
          </div>

          {/* Coming Soon: Progress Dashboard */}
          <div className="card" style={{ opacity: 0.7 }}>
            <div className="flex items-start justify-between mb-lg">
              <div className="text-4xl" style={{ opacity: 0.5 }}>📊</div>
              <span className="status-indicator">Coming Soon</span>
            </div>
            <h3 className="text-xl font-semibold text-muted mb-sm">Progress Dashboard</h3>
            <p className="text-sm text-muted mb-md">Track Your Improvement</p>
            <p className="text-muted mb-lg">
              View test history, track score improvements, and get 
              personalized recommendations.
            </p>
            <div className="flex gap-md text-sm text-muted mb-lg">
              <span>Score tracking</span>
              <span>•</span>
              <span>Analytics</span>
              <span>•</span>
              <span>Insights</span>
            </div>
            <div className="btn btn-secondary w-full" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Coming Soon
            </div>
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="container">
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-center mb-xl">
            <h2 className="text-3xl font-bold text-primary mb-md">
              Why Choose ScoreSpoken?
            </h2>
          </div>
          
          <div className="grid grid-cols-3 gap-xl">
            <div className="text-center">
              <div className="text-4xl mb-md">🤖</div>
              <h3 className="text-lg font-semibold text-primary mb-sm">AI-Powered Analysis</h3>
              <p className="text-secondary">
                Get detailed feedback on all 4 IELTS criteria with specific 
                improvement suggestions.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-md">⚡</div>
              <h3 className="text-lg font-semibold text-primary mb-sm">Instant Results</h3>
              <p className="text-secondary">
                Receive comprehensive scoring and feedback within seconds 
                of completing your test.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-md">🎯</div>
              <h3 className="text-lg font-semibold text-primary mb-sm">Realistic Practice</h3>
              <p className="text-secondary">
                Practice with authentic IELTS questions and timing that 
                mirrors the real exam.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

/* Custom styles for this page */
const styles = `
  .max-w-2xl {
    max-width: 42rem;
  }
  
  .mx-auto {
    margin-left: auto;
    margin-right: auto;
  }
  
  .w-full {
    width: 100%;
  }
  
  @media (max-width: 768px) {
    .grid-cols-3 {
      grid-template-columns: 1fr;
    }
  }
`