import { altheaAssets }
 from '@/provider/chainRegistry';
import {
    Asset
  } from '@chain-registry/types';


  export const getCoin = () => {
    return altheaAssets?.assets[0] as Asset;
  };