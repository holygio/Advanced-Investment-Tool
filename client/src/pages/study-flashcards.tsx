import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, RotateCw, CheckCircle, XCircle, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import flashcardsData from "@/data/flashcards.json";

interface Flashcard {
  id: string;
  source: string;
  year: number;
  topic_primary: string;
  topic_secondary: string[];
  difficulty: string;
  question: string;
  hint?: string;
  answer_short: string;
  framework: {
    step1_problem_and_topic: string;
    step2_single_or_combined: string;
    step3_variables_and_effects: string[];
    step4_required_action: string;
    step5_method_or_truth_test: string;
    result_takeaway: string;
  };
}

const TOPICS = ["All", "CAPM", "Risk", "Anomalies", "Utility", "Factors", "Portfolio", "Fixed Income"];
const DIFFICULTIES = ["All", "easy", "medium", "hard"];

export default function StudyFlashcards() {
  const [cards] = useState<Flashcard[]>(flashcardsData as Flashcard[]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [mode, setMode] = useState<"study" | "quiz">("study");
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("knownFlashcards");
    if (stored) {
      setKnownCards(new Set(JSON.parse(stored)));
    }
  }, []);

  useEffect(() => {
    let filtered = cards;
    if (selectedTopic !== "All") {
      filtered = filtered.filter(c => 
        c.topic_primary === selectedTopic || c.topic_secondary.includes(selectedTopic)
      );
    }
    if (selectedDifficulty !== "All") {
      filtered = filtered.filter(c => c.difficulty === selectedDifficulty);
    }
    setFilteredCards(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedTopic, selectedDifficulty, cards]);

  const currentCard = filteredCards[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setQuizAnswer(null);
    }
  }, [currentIndex, filteredCards.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setQuizAnswer(null);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  const handleShuffle = () => {
    const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);
    setFilteredCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const markAsKnown = (known: boolean) => {
    const newKnown = new Set(knownCards);
    if (known) {
      newKnown.add(currentCard.id);
    } else {
      newKnown.delete(currentCard.id);
    }
    setKnownCards(newKnown);
    localStorage.setItem("knownFlashcards", JSON.stringify(Array.from(newKnown)));
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        handleFlip();
      } else if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "p" || e.key === "P" || e.key === "ArrowLeft") {
        handlePrevious();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleFlip, handleNext, handlePrevious]);

  const progress = selectedTopic === "All" 
    ? (knownCards.size / cards.length) * 100
    : (filteredCards.filter(c => knownCards.has(c.id)).length / filteredCards.length) * 100;

  if (!currentCard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          No flashcards found for the selected filters.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Study Flashcards</h1>
        <p className="text-muted-foreground">Master advanced investments concepts with interactive flashcards from past exams</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
          <SelectTrigger className="w-48" data-testid="select-topic">
            <SelectValue placeholder="Select Topic" />
          </SelectTrigger>
          <SelectContent>
            {TOPICS.map(topic => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-48" data-testid="select-difficulty">
            <SelectValue placeholder="Select Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map(diff => (
              <SelectItem key={diff} value={diff}>{diff}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={handleShuffle}
          data-testid="button-shuffle"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Shuffle
        </Button>

        <div className="ml-auto">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "study" | "quiz")}>
            <TabsList data-testid="tabs-mode">
              <TabsTrigger value="study">Study Mode</TabsTrigger>
              <TabsTrigger value="quiz">Quiz Mode</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Progress: {Math.round(progress)}% mastered
          </span>
          <span className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {filteredCards.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="perspective-1000 mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id + isFlipped.toString()}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative min-h-[400px]"
          >
            {!isFlipped ? (
              <Card className="p-8 backface-hidden" data-testid="card-front">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" data-testid="badge-topic">{currentCard.topic_primary}</Badge>
                    {currentCard.topic_secondary.map(topic => (
                      <Badge key={topic} variant="secondary" data-testid={`badge-secondary-${topic}`}>{topic}</Badge>
                    ))}
                    <Badge 
                      variant={currentCard.difficulty === "easy" ? "default" : currentCard.difficulty === "medium" ? "secondary" : "destructive"}
                      data-testid="badge-difficulty"
                    >
                      {currentCard.difficulty}
                    </Badge>
                  </div>
                  {knownCards.has(currentCard.id) && (
                    <CheckCircle className="h-5 w-5 text-green-600" data-testid="icon-known" />
                  )}
                </div>

                <h2 className="text-xl font-semibold mb-4 text-foreground">Question</h2>
                <p className="text-lg mb-4 text-foreground leading-relaxed">{currentCard.question}</p>

                {currentCard.hint && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Hint:</span> {currentCard.hint}
                    </p>
                  </div>
                )}

                <div className="mt-6 text-sm text-muted-foreground">
                  <p>Source: {currentCard.source} ({currentCard.year})</p>
                </div>

                <div className="mt-8 text-center">
                  <Button onClick={handleFlip} size="lg" data-testid="button-flip">
                    Click to see answer (or press F)
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-8 backface-hidden" style={{ transform: "rotateY(180deg)" }} data-testid="card-back">
                <h2 className="text-xl font-semibold mb-4 text-foreground">Professor's 5-Step Framework</h2>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                    <h3 className="font-semibold text-sm text-foreground mb-2">1. Problem and Topic</h3>
                    <p className="text-sm text-muted-foreground">{currentCard.framework.step1_problem_and_topic}</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-md border border-purple-200">
                    <h3 className="font-semibold text-sm text-foreground mb-2">2. Single or Combined Topic?</h3>
                    <p className="text-sm text-muted-foreground">{currentCard.framework.step2_single_or_combined}</p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-md border border-amber-200">
                    <h3 className="font-semibold text-sm text-foreground mb-2">3. Variables and Effects</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {currentCard.framework.step3_variables_and_effects.map((item, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground font-mono">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                    <h3 className="font-semibold text-sm text-foreground mb-2">4. Required Action</h3>
                    <p className="text-sm text-muted-foreground">{currentCard.framework.step4_required_action}</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-md border border-purple-200">
                    <h3 className="font-semibold text-sm text-foreground mb-2">5. Method / Truth Test</h3>
                    <p className="text-sm text-muted-foreground">{currentCard.framework.step5_method_or_truth_test}</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-md border-l-4 border-green-500">
                    <h3 className="font-semibold text-sm text-foreground mb-2">Result / Takeaway</h3>
                    <p className="text-sm text-muted-foreground">{currentCard.framework.result_takeaway}</p>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Quick Answer:</span> {currentCard.answer_short}
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <Button onClick={handleFlip} variant="outline" data-testid="button-flip-back">
                    Back to Question
                  </Button>
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          data-testid="button-previous"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant={knownCards.has(currentCard.id) ? "outline" : "default"}
            onClick={() => markAsKnown(true)}
            data-testid="button-mark-known"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Know It
          </Button>
          <Button
            variant="outline"
            onClick={() => markAsKnown(false)}
            data-testid="button-mark-unknown"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Review Again
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === filteredCards.length - 1}
          data-testid="button-next"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Keyboard shortcuts: F (flip) · N/→ (next) · P/← (previous)</p>
      </div>
    </div>
  );
}
