import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, BarChart3, LineChart, BookOpen, Brain, Globe } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center gap-3">
            <TrendingUp className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">Advanced Portfolio Management Tool</h1>
          </div>
          <p className="text-lg text-muted-foreground italic">
            Connecting Markowitz Theory with Practice - Advanced Investments Course
          </p>
        </div>

        {/* Welcome Section */}
        <Card className="p-8">
          <h2 className="text-3xl font-semibold mb-6">Welcome to the Advanced Portfolio Management Tool</h2>
          <p className="text-muted-foreground mb-8">
            This application implements the theoretical concepts from your Advanced Investments course:
          </p>

          {/* What you'll learn */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">What you'll learn:</h3>
              </div>
              <ul className="space-y-3 ml-8">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Markowitz Mean-Variance Optimization:</strong> How to build efficient portfolios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Efficient Frontier:</strong> The "bullet" of optimal risk-return combinations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>CAPM Analysis:</strong> Beta calculation and Security Market Line</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Capital Market Line:</strong> Risk-free asset integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Portfolio Theory:</strong> Connecting academic theory with practice</span>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Features:</h3>
              </div>
              <ul className="space-y-3 ml-8">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Real market data from Yahoo Finance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Interactive portfolio optimization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Advanced visualizations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Theoretical explanations</span>
                </li>
              </ul>
            </div>

            {/* Get Started */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <LineChart className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Get Started:</h3>
              </div>
              <ol className="space-y-3 ml-8 list-decimal">
                <li>Configure your portfolio in the sidebar</li>
                <li>Select your investment universe (tickers)</li>
                <li>Set risk parameters and constraints</li>
                <li>Click "Load Data & Optimize Portfolio"</li>
              </ol>
            </div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground italic border-t pt-6">
            This tool bridges the gap between the theoretical concepts you study and their practical implementation in portfolio management.
          </p>
        </Card>

        {/* Information & Global Markets Lab */}
        <Card className="p-8 bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-8 w-8 text-green-600" />
            <h2 className="text-2xl font-semibold">Information & Global Markets Lab</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Explore international diversification, home bias, and information asymmetry through interactive simulations:
          </p>
          <ul className="space-y-2 ml-6 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">•</span>
              <span>Global diversification and currency risk</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">•</span>
              <span>Home bias puzzle and efficiency loss</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">•</span>
              <span>Grossman (1976) model of information aggregation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">•</span>
              <span>Rational expectations and market efficiency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">•</span>
              <span>Black-Litterman framework connection</span>
            </li>
          </ul>
          <div className="flex gap-4">
            <Link href="/information">
              <Button size="lg" className="gap-2" data-testid="button-information-lab">
                <Globe className="h-5 w-5" />
                Explore Information Lab
              </Button>
            </Link>
          </div>
        </Card>

        {/* Study Tools */}
        <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-semibold">Study Flashcards</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Master advanced investments concepts with interactive flashcards from past exams. Each card includes the professor's 5-step framework to help you understand:
          </p>
          <ul className="space-y-2 ml-6 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Problem identification and topic classification</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Single vs combined topic analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Relevant variables and effects</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Required actions and methodology</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Key takeaways and results</span>
            </li>
          </ul>
          <div className="flex gap-4">
            <Link href="/study/flashcards">
              <Button size="lg" className="gap-2" data-testid="button-study-flashcards">
                <Brain className="h-5 w-5" />
                Study Flashcards
              </Button>
            </Link>
          </div>
        </Card>

        {/* Quick Start Button */}
        <div className="flex justify-center pb-8">
          <Link href="/portfolio">
            <Button size="lg" variant="outline" className="gap-2" data-testid="button-get-started">
              <TrendingUp className="h-5 w-5" />
              Start Building Portfolios
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
