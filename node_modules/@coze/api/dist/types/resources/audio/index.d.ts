import { Voices } from './voices/index';
import { Transcriptions } from './transcriptions/index';
import { Speech } from './speech/index';
import { Rooms } from './rooms/index';
import { APIResource } from '../resource';
import { VoiceprintGroups } from './voiceprint-groups';
import { Live } from './live';
export declare class Audio extends APIResource {
    rooms: Rooms;
    live: Live;
    voices: Voices;
    speech: Speech;
    transcriptions: Transcriptions;
    voiceprintGroups: VoiceprintGroups;
}
export * from './rooms/index';
export * from './voices/index';
export * from './transcriptions/index';
export * from './voiceprint-groups/index';
export * from './live/index';
