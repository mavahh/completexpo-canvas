import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, Tag, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePosPermissions } from '@/hooks/usePosPermissions';
import { usePosCategories, usePosProducts, usePosRegisters } from '@/hooks/usePosData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ProductDialog } from '@/components/pos/ProductDialog';
import { CategoryDialog } from '@/components/pos/CategoryDialog';
import { RegisterDialog } from '@/components/pos/RegisterDialog';
import { formatCents, VAT_RATE_LABELS } from '@/types/pos';
import type { PosProduct, PosCategory, PosRegister } from '@/types/pos';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PosProducts() {
  const { id: eventId } = useParams<{ id: string }>();
  const { loading: permLoading, canAdmin } = usePosPermissions(eventId || null);
  
  const { categories, loading: catLoading, refetch: refetchCategories } = usePosCategories(eventId || null);
  const { products, loading: prodLoading, refetch: refetchProducts } = usePosProducts(eventId || null);
  const { registers, loading: regLoading, refetch: refetchRegisters } = usePosRegisters(eventId || null);

  const [editProduct, setEditProduct] = useState<PosProduct | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  
  const [editCategory, setEditCategory] = useState<PosCategory | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  
  const [editRegister, setEditRegister] = useState<PosRegister | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  const [deleteItem, setDeleteItem] = useState<{ type: 'product' | 'category' | 'register'; id: string; name: string } | null>(null);

  const isLoading = permLoading || catLoading || prodLoading || regLoading;

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      let error: any;
      
      if (deleteItem.type === 'product') {
        ({ error } = await supabase.from('pos_products').delete().eq('id', deleteItem.id));
        if (!error) refetchProducts();
      } else if (deleteItem.type === 'category') {
        ({ error } = await supabase.from('pos_categories').delete().eq('id', deleteItem.id));
        if (!error) refetchCategories();
      } else if (deleteItem.type === 'register') {
        ({ error } = await supabase.from('pos_registers').delete().eq('id', deleteItem.id));
        if (!error) refetchRegisters();
      }

      if (error) throw error;
      toast.success('Item verwijderd');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Fout bij verwijderen');
    } finally {
      setDeleteItem(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!canAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Je hebt geen toegang tot productbeheer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">POS Productbeheer</h1>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Producten
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Categorieën
          </TabsTrigger>
          <TabsTrigger value="registers" className="gap-2">
            <Monitor className="h-4 w-4" />
            Kassa's
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Producten</CardTitle>
              <Button onClick={() => { setEditProduct(null); setShowProductDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Product toevoegen
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Prijs</TableHead>
                    <TableHead>BTW</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Geen producten gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku || '-'}</TableCell>
                        <TableCell>{product.category?.name || '-'}</TableCell>
                        <TableCell>{formatCents(product.price_cents)}</TableCell>
                        <TableCell>{VAT_RATE_LABELS[product.vat_rate]}</TableCell>
                        <TableCell>
                          <Badge variant={product.active ? 'default' : 'secondary'}>
                            {product.active ? 'Actief' : 'Inactief'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditProduct(product); setShowProductDialog(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteItem({ type: 'product', id: product.id, name: product.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categorieën</CardTitle>
              <Button onClick={() => { setEditCategory(null); setShowCategoryDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Categorie toevoegen
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Volgorde</TableHead>
                    <TableHead>Producten</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Geen categorieën gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map(cat => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>{cat.sort_order}</TableCell>
                        <TableCell>{products.filter(p => p.category_id === cat.id).length}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditCategory(cat); setShowCategoryDialog(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteItem({ type: 'category', id: cat.id, name: cat.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registers Tab */}
        <TabsContent value="registers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kassa's</CardTitle>
              <Button onClick={() => { setEditRegister(null); setShowRegisterDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Kassa toevoegen
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Geen kassa's gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    registers.map(reg => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.name}</TableCell>
                        <TableCell>{reg.location || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={reg.is_active ? 'default' : 'secondary'}>
                            {reg.is_active ? 'Actief' : 'Inactief'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditRegister(reg); setShowRegisterDialog(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteItem({ type: 'register', id: reg.id, name: reg.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ProductDialog
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        eventId={eventId || ''}
        product={editProduct}
        categories={categories}
        onSuccess={() => {
          refetchProducts();
          setShowProductDialog(false);
        }}
      />

      <CategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        eventId={eventId || ''}
        category={editCategory}
        onSuccess={() => {
          refetchCategories();
          setShowCategoryDialog(false);
        }}
      />

      <RegisterDialog
        open={showRegisterDialog}
        onOpenChange={setShowRegisterDialog}
        eventId={eventId || ''}
        register={editRegister}
        onSuccess={() => {
          refetchRegisters();
          setShowRegisterDialog(false);
        }}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt om "{deleteItem?.name}" te verwijderen. Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
