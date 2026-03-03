import type { DimensionConfig } from './types';

export const unicornConfig: DimensionConfig = {
    root: 'unicorn',
    dimensions: {
        character: [
            'baby unicorn',
            'fly unicorn',
            'princess unicorn',
            'fairy unicorn',
            'alicorn',
            'pegasus'
        ],
        style: [
            'cute',
            'cartoon',
            'kawaii',
            'realistic',
            'simple',
            'easy',
            'detailed',
            'mandala style',
            'aesthetic'
        ],
        scene: [
            'with rainbow',
            'in clouds',
            'in enchanted forest',
            'with stars',
            'flying in sky',
            'sleeping on moon'
        ],
        audience: [
            'for kids',
            'for toddlers',
            'for girls',
            'for adults'
        ]
    },
    patterns: [
        "{style} {character} {scene} coloring page",
        "{style} {character} coloring page {audience}",
        "{character} {scene} coloring page for kids",
        "detailed {character} {scene} {root} coloring page",
        "{style} {root} coloring page {audience}",
        "{root} {character} {scene} coloring pages"
    ]
};
