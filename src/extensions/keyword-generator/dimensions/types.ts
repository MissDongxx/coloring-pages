export interface DimensionConfig {
    /** The primary root keyword (e.g., 'dinosaur', 'christmas') */
    root: string;

    /** A dictionary of dimensions where keys are variables like 'style', 'audience' etc. */
    dimensions: Record<string, string[]>;

    /** 
     * Array of combination patterns. 
     * e.g. "{style} {root} coloring pages {audience}"
     * The generator will randomly pick a pattern and replace its variables.
     */
    patterns: string[];
}
