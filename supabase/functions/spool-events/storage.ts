import {FetchHttpHandler} from 'npm:@smithy/fetch-http-handler@5.8.1';
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand,
  CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand
} from 'npm:@aws-sdk/client-s3@3.958.0';
import { createClient } from 'npm:@supabase/supabase-js@2.108.2';

export function eventStorage(url: string, serviceKey: string, region: string, accessKeyId: string, secretAccessKey: string) {
  const db = createClient(url, serviceKey, {auth:{persistSession:false,autoRefreshToken:false}});
  const records = () => db.from('spool_event_records');
  const bucket = 'spool-event-files';
  // Session and gallery metadata are in Postgres; initialize the S3 transport on file access.
  let client:S3Client;
  const s3 = () => client ??= new S3Client({region, endpoint:url+'/storage/v1/s3', forcePathStyle:true,
    requestHandler:new FetchHttpHandler(),defaultUserAgentProvider:async()=>[['spool-events','1']],
    requestChecksumCalculation:'WHEN_REQUIRED', responseChecksumValidation:'WHEN_REQUIRED',
    credentials:{accessKeyId, secretAccessKey}});
  const target = (key: string) => ({Bucket:bucket, Key:key});
  const metadata = (key: string) => key.endsWith('.json');
  async function read(key: string, head: boolean) {
    if (metadata(key)) {
      const {data,error} = await records().select('value,revision').eq('key',key).maybeSingle();
      if (error) throw error;
      return data && {key,etag:data.revision,json:async()=>data.value};
    }
    try {
      const object = head ? await s3().send(new HeadObjectCommand(target(key))) : await s3().send(new GetObjectCommand(target(key)));
      return {key,size:object.ContentLength,etag:object.ETag,httpMetadata:{contentType:object.ContentType},
        body:'Body' in object ? (object as import('npm:@aws-sdk/client-s3@3.958.0').GetObjectCommandOutput).Body?.transformToWebStream() : undefined};
    } catch (error) {
      if ((error as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode === 404) return null;
      throw error;
    }
  }
  function multipart(key:string, uploadId:string) {
    const params = {...target(key),UploadId:uploadId};
    return {
      async uploadPart(partNumber:number, body:Uint8Array) {
        const {ETag} = await s3().send(new UploadPartCommand({...params,PartNumber:partNumber,Body:body}));
        return {partNumber,etag:ETag};
      },
      complete:(parts:{partNumber:number,etag:string}[])=>s3().send(new CompleteMultipartUploadCommand({...params,
        MultipartUpload:{Parts:parts.map(p=>({PartNumber:p.partNumber,ETag:p.etag}))}})),
      abort:()=>s3().send(new AbortMultipartUploadCommand(params))
    };
  }
  return {
    get:(key:string)=>read(key,false), head:(key:string)=>read(key,true),
    async list({prefix,cursor,limit}:{prefix:string,cursor?:string,limit:number}) {
      // All list operations in the event API enumerate metadata namespaces.
      let query = records().select('key').like('key',prefix+'%').order('key').limit(limit);
      if (cursor) query=query.gt('key',cursor);
      const {data,error}=await query;
      if(error) throw error;
      return {objects:data,truncated:data.length===limit,cursor:data.at(-1)?.key};
    },
    async put(key:string, body:string|Uint8Array|ReadableStream, options:{onlyIf?:{etagMatches?:string,etagDoesNotMatch?:string},httpMetadata?:{contentType:string}}={}) {
      if (!metadata(key)) {
        const bytes=new Uint8Array(await new Response(body as BodyInit).arrayBuffer());
        return s3().send(new PutObjectCommand({...target(key),Body:bytes,ContentType:options.httpMetadata?.contentType}));
      }
      const row={key,value:JSON.parse(body as string),revision:crypto.randomUUID()};
      const match=options.onlyIf?.etagMatches;
      const create=options.onlyIf?.etagDoesNotMatch==='*';
      const query=match ? records().update(row).eq('key',key).eq('revision',match) :
        create ? records().insert(row) : records().upsert(row);
      const {data,error}=await query.select('revision').maybeSingle();
      if(create && error?.code==='23505') return null;
      if(error) throw error;
      return data && {etag:data.revision};
    },
    async delete(key:string) {
      if(!metadata(key)) return s3().send(new DeleteObjectCommand(target(key)));
      const {error}=await records().delete().eq('key',key);
      if(error) throw error;
    },
    async createMultipartUpload(key:string,options:{httpMetadata:{contentType:string}}) {
      const result=await s3().send(new CreateMultipartUploadCommand({...target(key),ContentType:options.httpMetadata.contentType}));
      return {uploadId:result.UploadId};
    },
    resumeMultipartUpload:multipart
  };
}
