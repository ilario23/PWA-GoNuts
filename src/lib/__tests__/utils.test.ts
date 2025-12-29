import { cn } from '../utils';

describe('utils', () => {
    describe('cn', () => {
        it('should merge class names correctly', () => {
            const result = cn('foo', 'bar');
            expect(result).toBe('foo bar');
        });

        it('should handle conditional classes', () => {
            // eslint-disable-next-line no-constant-binary-expression
            const result = cn('foo', false && 'bar', 'baz');
            expect(result).toBe('foo baz');
        });

        it('should merge tailwind classes correctly', () => {
            const result = cn('px-2 py-1', 'px-4');
            expect(result).toBe('py-1 px-4');
        });

        it('should handle arrays of classes', () => {
            const result = cn(['foo', 'bar'], 'baz');
            expect(result).toBe('foo bar baz');
        });

        it('should handle objects with boolean values', () => {
            const result = cn({ foo: true, bar: false, baz: true });
            expect(result).toBe('foo baz');
        });

        it('should handle undefined and null', () => {
            const result = cn('foo', undefined, null, 'bar');
            expect(result).toBe('foo bar');
        });

        it('should handle empty input', () => {
            const result = cn();
            expect(result).toBe('');
        });
    });
});
