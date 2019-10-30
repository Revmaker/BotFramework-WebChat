import { Activity } from 'botframework-directlinejs';

declare global {
  interface Window {
    CMS_URL: string;
    buttonClickCallback: (payload: object) => void;
    customData: object;
  }
}

export interface FormatOptions {
  showHeader?: boolean // DEPRECATED: Use "title" instead
}

export type ActivityOrID = {
  activity?: Activity
  id?: string
}
