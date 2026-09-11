export interface ThemeCopy {
  world: {
    name: string;
    title: string;
    transition: string;
  };
  controls: {
    legend: string;
    motion: { running: string; paused: string };
  };
  hero: { intro: string };
  about: { body: string };
  actions: {
    contact: string;
    resume: string;
    explore: string;
    source: string;
    email: string;
    backToTop: string;
  };
  capabilities: Record<string, string>;
  experience: Record<string, { summary: string }>;
  projects: Record<string, { category: string; description: string }>;
}
