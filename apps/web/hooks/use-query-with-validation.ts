import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";

interface UseQueryWithValidationOptions<TData, TValidated>
  extends Omit<UseQueryOptions<TValidated, Error, TValidated>, "queryFn"> {
  queryFn: () => Promise<TData>;
  schema: z.ZodSchema<TValidated>;
  onValidationError?: (error: z.ZodError) => void;
}

export function useQueryWithValidation<TData, TValidated>({
  queryFn,
  schema,
  onValidationError,
  ...options
}: UseQueryWithValidationOptions<TData, TValidated>): UseQueryResult<TValidated, Error> {
  return useQuery({
    ...options,
    queryFn: async () => {
      const data = await queryFn();
      try {
        return schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          onValidationError?.(error);
          throw new Error(
            `Validation error: ${error.issues.map((e: any) => e.message).join(", ")}`
          );
        }
        throw error;
      }
    },
  });
}
