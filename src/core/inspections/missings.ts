import type Arborist from '@npmcli/arborist';

export async function getMissing(arb: Arborist) {
   const tree = await arb.loadActual();

   return await tree.querySelectorAll(':missing');
}
