export class StringUtils {
    static isEmpty(value: string | null | undefined): boolean {
        return !value || value.trim().length === 0;
    }

    static capitalize(value: string): string {
        if (this.isEmpty(value)) {
            return value;
        }
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    static trimPath(path: string): string {
        return path.replace(/\\/g, '/').trim();
    }
}