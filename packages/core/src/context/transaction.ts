// Transaction context has been removed
// Use explicit prisma.$transaction() instead

// Example of the new pattern:
// const result = await prisma.$transaction(async (tx) => {
//   const ticket = await tx.ticket.create({ ... });
//   await tx.event.create({ ... }); // Audit log in transaction
//   return ticket;
// });
// 
// // External effects after transaction
// await externalService.notify(result);

export {};