import type Arborist from '@npmcli/arborist';

export async function getInvalid(arb: Arborist) {
   const tree = await arb.loadActual();

   return await tree.querySelectorAll(':invalid');
}
