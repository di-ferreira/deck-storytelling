/** Story Bible e decisões criativas (etapa 16 do master prompt). */

export interface StoryBibleRef {
  readonly generatedAt: string;
  readonly path: string;
  readonly dirty: boolean;
  readonly userEditsPreserved: boolean;
}

export interface Decision {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly cardIds: readonly string[];
  readonly createdAt: string;
}

export function createEmptyStoryBibleRef(): StoryBibleRef {
  return {
    generatedAt: '',
    path: 'Story/story-bible.md',
    dirty: true,
    userEditsPreserved: true,
  };
}

export function createEmptyDecision(id: string, createdAt: string): Decision {
  return { id, title: '', description: '', cardIds: [], createdAt };
}

export function storyBibleRefFromJson(json: Partial<StoryBibleRef> | undefined): StoryBibleRef {
  const empty = createEmptyStoryBibleRef();
  if (!json) {
    return empty;
  }
  return {
    generatedAt: typeof json.generatedAt === 'string' ? json.generatedAt : '',
    path: typeof json.path === 'string' && json.path ? json.path : empty.path,
    dirty: typeof json.dirty === 'boolean' ? json.dirty : true,
    userEditsPreserved: typeof json.userEditsPreserved === 'boolean' ? json.userEditsPreserved : true,
  };
}

export function decisionFromJson(json: Partial<Decision> | undefined, fallbackId: string): Decision {
  if (!json) {
    return createEmptyDecision(fallbackId, '');
  }
  return {
    id: typeof json.id === 'string' && json.id ? json.id : fallbackId,
    title: typeof json.title === 'string' ? json.title : '',
    description: typeof json.description === 'string' ? json.description : '',
    cardIds: Array.isArray(json.cardIds) ? [...json.cardIds] : [],
    createdAt: typeof json.createdAt === 'string' ? json.createdAt : '',
  };
}
