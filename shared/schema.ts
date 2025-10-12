import { z } from "zod";

// ===== Portfolio Data Schemas =====

export const priceDataPointSchema = z.object({
  date: z.string(),
  adjClose: z.number(),
});

export const returnDataPointSchema = z.object({
  date: z.string(),
  ret: z.number(),
});

export const tickerPricesSchema = z.record(z.string(), z.array(priceDataPointSchema));
export const tickerReturnsSchema = z.record(z.string(), z.array(returnDataPointSchema));

export const fetchPricesRequestSchema = z.object({
  tickers: z.array(z.string()),
  start: z.string(), // YYYY-MM-DD
  end: z.string(),
  interval: z.enum(["1d", "1wk", "1mo"]).optional().default("1d"),
  log_returns: z.boolean().optional().default(false),
});

export const fetchPricesResponseSchema = z.object({
  prices: tickerPricesSchema,
  returns: tickerReturnsSchema,
});

// ===== Portfolio Optimization Schemas =====

export const efficientFrontierPointSchema = z.object({
  risk: z.number(),
  return: z.number(),
  weights: z.record(z.string(), z.number()),
});

export const tangencyPortfolioSchema = z.object({
  risk: z.number(),
  return: z.number(),
  sharpe: z.number(),
  weights: z.record(z.string(), z.number()),
});

export const cmlPointSchema = z.object({
  risk: z.number(),
  return: z.number(),
});

export const efficientFrontierRequestSchema = z.object({
  returns: tickerReturnsSchema,
  rf: z.number(),
  allow_short: z.boolean(),
});

export const efficientFrontierResponseSchema = z.object({
  frontier: z.array(efficientFrontierPointSchema),
  tangency: tangencyPortfolioSchema,
  cml: z.array(cmlPointSchema),
});

// ===== CAPM Model Schemas =====

export const capmResultSchema = z.object({
  ticker: z.string(),
  alpha: z.number(),
  beta: z.number(),
  t_alpha: z.number(),
  t_beta: z.number(),
  r2: z.number(),
});

export const smlPointSchema = z.object({
  beta: z.number(),
  expectedReturn: z.number(),
});

export const capmRequestSchema = z.object({
  returns: tickerReturnsSchema,
  market: z.string(),
  rf_series: z.array(z.object({ date: z.string(), rf: z.number() })).optional(),
});

export const capmResponseSchema = z.object({
  results: z.array(capmResultSchema),
  sml: z.array(smlPointSchema),
  summary: z.record(z.string(), z.any()),
});

// ===== Factor Analysis Schemas =====

export const factorDataPointSchema = z.object({
  date: z.string(),
  MKT_RF: z.number().optional(),
  SMB: z.number().optional(),
  HML: z.number().optional(),
  MOM: z.number().optional(),
  RMW: z.number().optional(),
  CMA: z.number().optional(),
  TERM: z.number().optional(),
  CREDIT: z.number().optional(),
});

export const factorLoadingSchema = z.object({
  factor: z.string(),
  beta: z.number(),
  t: z.number(),
});

export const factorRequestSchema = z.object({
  portfolio: z.array(returnDataPointSchema),
  factors: z.array(factorDataPointSchema),
});

export const factorResponseSchema = z.object({
  loadings: z.array(factorLoadingSchema),
  alpha: z.number(),
  r2: z.number(),
  corr: z.array(z.array(z.number())),
  factorMeans: z.record(z.string(), z.number()),
});

// ===== Risk & Performance Schemas =====

export const performanceRequestSchema = z.object({
  portfolio: z.array(returnDataPointSchema),
  benchmark: z.array(returnDataPointSchema).optional(),
  rf: z.number().optional(),
  lpm: z.object({
    tau: z.number(),
    n: z.number(),
  }).optional(),
});

export const performanceResponseSchema = z.object({
  sharpe: z.number(),
  treynor: z.number().optional(),
  informationRatio: z.number().optional(),
  jensenAlpha: z.number().optional(),
  m2: z.number().optional(),
  skew: z.number(),
  kurtosis: z.number(),
  jb: z.number(),
  lpm: z.number().optional(),
});

// ===== Utility & SDF Schemas =====

export const utilityPointSchema = z.object({
  x: z.number(),
  U: z.number(),
});

export const utilityPrimePointSchema = z.object({
  x: z.number(),
  Uprime: z.number(),
});

export const utilityRequestSchema = z.object({
  type: z.enum(["CRRA", "CARA", "DARA"]),
  gamma: z.number(),
  x_range: z.tuple([z.number(), z.number()]).optional(),
});

export const utilityResponseSchema = z.object({
  pointsU: z.array(utilityPointSchema),
  pointsUPrime: z.array(utilityPrimePointSchema),
  notes: z.string(),
});

// ===== Fixed Income Schemas =====

export const yieldCurvePointSchema = z.object({
  tenor: z.string(),
  yield: z.number(),
});

export const creditSpreadPointSchema = z.object({
  date: z.string(),
  spread: z.number(),
});

export const fixedIncomeRequestSchema = z.object({
  useFRED: z.boolean().optional(),
});

export const fixedIncomeResponseSchema = z.object({
  yieldCurve: z.array(yieldCurvePointSchema),
  termSpread: z.number(),
  creditProxy: z.object({
    series: z.array(creditSpreadPointSchema),
    latest: z.number(),
  }),
});

// ===== Derivatives Schemas =====

export const riskNeutralRequestSchema = z.object({
  ticker: z.string(),
  expiry: z.string(),
  s: z.number(),
  r: z.number(),
  u: z.number(),
  d: z.number(),
});

export const riskNeutralResponseSchema = z.object({
  p_up: z.number(),
  p_down: z.number(),
  notes: z.string(),
});

// ===== TypeScript Types =====

export type PriceDataPoint = z.infer<typeof priceDataPointSchema>;
export type ReturnDataPoint = z.infer<typeof returnDataPointSchema>;
export type TickerPrices = z.infer<typeof tickerPricesSchema>;
export type TickerReturns = z.infer<typeof tickerReturnsSchema>;
export type FetchPricesRequest = z.infer<typeof fetchPricesRequestSchema>;
export type FetchPricesResponse = z.infer<typeof fetchPricesResponseSchema>;

export type EfficientFrontierPoint = z.infer<typeof efficientFrontierPointSchema>;
export type TangencyPortfolio = z.infer<typeof tangencyPortfolioSchema>;
export type CMLPoint = z.infer<typeof cmlPointSchema>;
export type EfficientFrontierRequest = z.infer<typeof efficientFrontierRequestSchema>;
export type EfficientFrontierResponse = z.infer<typeof efficientFrontierResponseSchema>;

export type CAPMResult = z.infer<typeof capmResultSchema>;
export type SMLPoint = z.infer<typeof smlPointSchema>;
export type CAPMRequest = z.infer<typeof capmRequestSchema>;
export type CAPMResponse = z.infer<typeof capmResponseSchema>;

export type FactorDataPoint = z.infer<typeof factorDataPointSchema>;
export type FactorLoading = z.infer<typeof factorLoadingSchema>;
export type FactorRequest = z.infer<typeof factorRequestSchema>;
export type FactorResponse = z.infer<typeof factorResponseSchema>;

export type PerformanceRequest = z.infer<typeof performanceRequestSchema>;
export type PerformanceResponse = z.infer<typeof performanceResponseSchema>;

export type UtilityPoint = z.infer<typeof utilityPointSchema>;
export type UtilityPrimePoint = z.infer<typeof utilityPrimePointSchema>;
export type UtilityRequest = z.infer<typeof utilityRequestSchema>;
export type UtilityResponse = z.infer<typeof utilityResponseSchema>;

export type YieldCurvePoint = z.infer<typeof yieldCurvePointSchema>;
export type CreditSpreadPoint = z.infer<typeof creditSpreadPointSchema>;
export type FixedIncomeRequest = z.infer<typeof fixedIncomeRequestSchema>;
export type FixedIncomeResponse = z.infer<typeof fixedIncomeResponseSchema>;

export type RiskNeutralRequest = z.infer<typeof riskNeutralRequestSchema>;
export type RiskNeutralResponse = z.infer<typeof riskNeutralResponseSchema>;
