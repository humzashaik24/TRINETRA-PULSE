/** next/navigation test double with a controllable pathname. */

let pathname = '/';

export const __setPathname = (p: string): void => {
  pathname = p;
};

export const __resetNavigation = (): void => {
  pathname = '/';
};

export function usePathname(): string {
  return pathname;
}

export function useRouter() {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams(): Record<string, string | string[]> {
  return {};
}

export function redirect(): never {
  throw new Error('redirect() not expected in tests');
}