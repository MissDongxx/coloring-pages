import type { DimensionConfig } from './types';

export const dinosaurConfig: DimensionConfig = {
    root: 'dinosaur',
    dimensions: {
        // 恐龙种类 - 扩展更多种类
        species: [
            // 著名恐龙
            't-rex', 'triceratops', 'stegosaurus', 'brachiosaurus', 'velociraptor',
            'pterodactyl', 'spinosaurus', 'ankylosaurus', 'parasaurolophus',
            'dilophosaurus', 'gallimimus', 'compsognathus',
            // 特殊类型
            'baby dinosaur', 'dinosaur nest with eggs', 'dinosaur family',
            'flying dinosaur', 'marine dinosaur', 'feathered dinosaur'
        ],
        // 风格 - 扩展多样风格
        style: [
            // 儿童风格
            'cute', 'cartoon', 'kawaii', 'simple', 'easy',
            // 成人/教育风格
            'realistic', 'scientific', 'anatomically correct', 'detailed', 'intricate',
            'skeletal illustration', 'fossil style', 'paleontology art',
            // 艺术风格
            'therapeutic', 'mandala style', 'geometric', 'aesthetic', 'vintage scientific'
        ],
        // 时期/环境
        environment: [
            'in jurassic jungle', 'in cretaceous forest', 'near volcano',
            'at watering hole', 'in prehistoric swamp', 'in desert landscape',
            'in cave', 'at nesting ground', 'in floodplain', 'near ocean'
        ],
        // 动作 - 扩展动作描述
        action: [
            // 基本动作
            'roaring', 'running', 'walking', 'sleeping', 'eating',
            // 复杂动作
            'hunting prey', 'fighting', 'mating dance', 'tending nest',
            'protecting eggs', 'feeding young', 'basking in sun',
            'splashing in water', 'crashing through trees', 'flying in formation'
        ],
        // 教育细节
        educational: [
            'showing scale with human', 'with size comparison', 'with skeleton overlay',
            'with plant labels', 'with period information', 'with footprints',
            'with fossil remains', 'with habitat diagram'
        ],
        // 互动元素
        companion: [
            'with other dinosaurs', 'with pterosaurs flying above', 'with prehistoric plants',
            'with insects', 'with smaller dinosaurs', 'with volcanic eruption',
            'with meteor shower', 'with prehistoric mammals'
        ]
    },
    patterns: [
        // 动作组合
        "{species} {action}",
        "{species} {action} {environment}",
        "{style} {species} {action}",
        // 环境组合
        "{species} in {environment}",
        "{style} {species} in {environment}",
        // 教育向
        "scientific {species} illustration",
        "{educational} {species}",
        "skeletal {species} diagram",
        "realistic {species} with {companion}",
        // 艺术/成人向
        "intricate {species} {action}",
        "geometric {species} pattern",
        "paleontology art {species}",
        // 特定情境
        "baby {species} hatching",
        "{species} family scene",
        "{style} {species} with {companion}"
    ]
};
