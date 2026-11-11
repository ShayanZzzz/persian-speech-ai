// Scene order is spatial: left room, entrance, right room.
// Keep IDs and destinations stable when replacing the art or objects.
export const workshopScenes = [
  { id: 'sound', number: '01', title: 'The sound bench.', subtitle: 'NEGAR / WORDS, VOICES & STORIES', description: 'A place to turn the things you hear into the things you create.' },
  { id: 'home', number: '00', title: 'A workshop for ideas.', subtitle: 'SHAYAN HUB / INDEPENDENT AI WORKSHOP', description: 'Every object opens a different possibility. Pick one. See where it leads.' },
  { id: 'lab', number: '02', title: 'Room for the unexpected.', subtitle: 'THE LAB / EXPERIMENTS IN PROGRESS', description: 'Unfinished ideas, curious machines, and space for what comes next.' },
] as const
export type WorkshopSceneIndex = 0 | 1 | 2
