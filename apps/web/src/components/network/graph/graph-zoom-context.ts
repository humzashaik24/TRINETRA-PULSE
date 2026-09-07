import * as React from 'react';

export const GraphZoomContext = React.createContext<number>(1);

export function useGraphZoom(): number {
  return React.useContext(GraphZoomContext);
}
