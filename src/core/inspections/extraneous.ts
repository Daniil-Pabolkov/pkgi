import type Arborist from '@npmcli/arborist';

export async function getExtraneous(arb: Arborist) {
   const tree = await arb.loadActual();

   return await tree.querySelectorAll(':extraneous');

   // how to get root only pkgs:
   //  const rootExtraneous = extraneous.filter(node => virtualTree.edgesOut.has(node.name));
}
