import {deleteAccountHandler} from '../../../server/delete-account.ts';
Deno.serve(deleteAccountHandler(key=>Deno.env.get(key)));
