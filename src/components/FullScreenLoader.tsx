type FullScreenLoaderProps = {
  message?: string;
};

export const FullScreenLoader = ({ message = 'Checking credentials…' }: FullScreenLoaderProps) => {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted/40 border-t-accent" />
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};
