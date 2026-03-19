import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ComponentType, Fragment, PropsWithChildren, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { ExplorerError } from '../../common/types/Error';
import { logError } from '../../common/utils/error-utils';
import { ErrorBox } from './ErrorBox';

interface ErrorBoundaryProps<WrapperProps extends PropsWithChildren<Record<string, unknown>>> {
  Wrapper?: ComponentType<WrapperProps>;
  wrapperProps?: WrapperProps;
  renderContent?: (error: ExplorerError) => ReactNode;
  children: ReactNode;
  tryAgainButton?: boolean;
  homeButton?: boolean;
}

export function ExplorerErrorBoundary<WrapperProps extends PropsWithChildren<unknown>>({
  Wrapper = Fragment,
  wrapperProps = {} as WrapperProps,
  renderContent,
  children,
  tryAgainButton,
  homeButton,
}: ErrorBoundaryProps<WrapperProps>) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={error => {
            logError(error, 'component-error-boundary');
          }}
          fallbackRender={({ error, resetErrorBoundary }) => {
            return (
              <Wrapper {...wrapperProps}>
                {renderContent ? (
                  renderContent(error)
                ) : (
                  <ErrorBox
                    error={error}
                    reset={() => {
                      reset();
                      resetErrorBoundary();
                    }}
                    tryAgainButton={tryAgainButton}
                    homeButton={homeButton}
                  />
                )}
              </Wrapper>
            );
          }}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
