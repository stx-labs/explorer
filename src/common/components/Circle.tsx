'use client';

import { Grid, GridProps } from '@chakra-ui/react';
import React from 'react';

export const Circle: React.FC<GridProps> = ({ ...gridProps }) => (
  <Grid placeItems="center" border="normal" rounded={'full'} flexShrink={0} {...gridProps} />
);
