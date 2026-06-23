// Seed question bank for the Bank sector. Used as adaptive examples for the
// analyst persona — NOT read verbatim. Focus on the credit story (durability,
// strategic rationale, management thinking) rather than memorized metrics.

export const BANK_QUESTIONS: Record<string, string[]> = {
  'Capital Adequacy': [
    'What is the credit story you want me to walk away with on capital?',
    'Where does your capital strategy break down in a scenario you find credible?',
    'How do you think about the right capital level for the business you actually run, not the one regulators score?',
    'If earnings disappoint for two years, what is the first lever you pull on capital?',
    'What is the strategic rationale for running where you do versus a turn higher?',
  ],
  'Asset Quality': [
    'Walk me through the credit story for your loan book in one minute.',
    'Where in your portfolio is the cycle hitting you earliest, and what does that tell you?',
    'What part of the book keeps you up at night that we have not talked about?',
    'How do you decide what is a discrete problem versus the start of a trend?',
    'If the cycle turns harder than your base case, where do you take the first real loss?',
  ],
  'Funding and Liquidity': [
    'Tell me the story of your deposit base — who they are and why they stay.',
    'What is your franchise advantage in funding, in plain terms?',
    'In a stress like March 2023, what would your week look like?',
    'How dependent is your funding strategy on rates staying where they are?',
    'What is the contingency funding plan you are most confident in, and the one you are least confident in?',
  ],
  'Earnings Outlook': [
    'What is the simple story for why earnings are durable from here?',
    'Where is consensus wrong about your earnings trajectory, and why?',
    'What is the strategic bet behind your revenue mix, and how is it tracking?',
    'If revenue underperforms by ten percent, what is your operating response?',
    'Which line of business is earning its cost of equity today, and which is not?',
  ],
  'Risk Management': [
    'What did the regional bank failures of 2023 change about how you run the firm?',
    'Tell me about a recent risk decision where the answer was uncomfortable but right.',
    'How does risk appetite actually get set at your firm — who decides, and what do they argue about?',
    'Where in the firm is your risk culture weakest, and what are you doing about it?',
    'What is the early-warning indicator your team watches that the market does not?',
  ],
  'Strategic & Macro': [
    'How is the M&A landscape shaping your thinking on inorganic growth over the next 18 months?',
    'What management or board changes should we be aware of?',
    'How are you thinking about capital distribution given where we are in the cycle?',
    'What is the regulatory change you are most preparing for, and how does it affect your strategic plan?',
    'How does the macro environment change your priorities for the next 12 months?',
    'What competitive or structural shift in your industry are you most attentive to?',
    'Tell me about key-person risk in the seats that matter most to this credit.',
  ],
}
