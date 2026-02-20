
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';

type Perfil = {
  id: string;
  nome: string;
  tipo_usuario: string;
};


const UsersManager = ({ user }: { user: any }) => {
  const [editingUser, setEditingUser] = useState<Perfil | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['perfis'],
    queryFn: async (): Promise<Perfil[]> => {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, tipo_usuario')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        Erro ao carregar usuários: {error.message}
      </div>
    );
  }

  const updateMutation = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<Perfil> }) => {
      const { error } = await supabase
        .from('perfis')
        .update(changes)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] });
      toast({ title: 'Usuário atualizado' });
      setEditingUser(null);
    },
    onError: (err) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });

  const handleEditUser = (changes: Partial<Perfil>) => {
    if (!editingUser) return;
    updateMutation.mutate({ id: editingUser.id, changes });
  };

  const handleAddUser = () => {
    toast({
      title: 'Criação de usuário',
      description: 'Para criar contas (Auth), use o cadastro (/signup) ou o Supabase Dashboard (Authentication > Users).',
      variant: 'destructive'
    });
  };

  const removeUser = (id: string) => {
    if (id === user?.id) {
      toast({ title: 'Você não pode remover a si mesmo', variant: 'destructive' });
      return;
    }
    toast({ title: 'Remoção desabilitada', description: 'Use o Supabase Dashboard para remover usuários.', variant: 'destructive' });
  };

  const getStatusBadge = () => {
    return (
      <Badge variant="default">
        Ativo
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roles = {
      super_admin: { variant: 'default' as const, className: 'bg-purple-500 hover:bg-purple-600', text: 'Super Admin' },
      admin_equipamento: { variant: 'default' as const, className: 'bg-blue-500 hover:bg-blue-600', text: 'Admin Equipamento' },
      usuario: { variant: 'secondary' as const, text: 'Usuário' }
    };
    const config = roles[role as keyof typeof roles] || roles.usuario;
    return (
      <Badge variant={config.variant} className={config.variant === 'default' ? config.className : undefined}>
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Gerenciar Usuários</span>
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Usuário</DialogTitle>
                <DialogDescription>
                  Para criar novos usuários, use o Supabase Dashboard (Authentication &gt; Users) e depois crie o perfil correspondente aqui.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome Completo</Label>
                  <Input disabled placeholder="Use /signup ou o Dashboard" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input disabled placeholder="Use /signup ou o Dashboard" />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Definida no perfil" />
                    </SelectTrigger>
                  </Select>
                </div>
                <Button onClick={handleAddUser} className="w-full">
                  Como adicionar usuário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum usuário encontrado.
              </div>
            ) : (
              users.map((userItem) => (
              <Card key={userItem.id} className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-lg">{userItem.nome || '(Sem nome)'}</h3>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getRoleBadge(userItem.tipo_usuario)}
                        {getStatusBadge()}
                      </div>
                      
                      
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(userItem)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Editar Usuário</DialogTitle>
                            <DialogDescription>
                              Altere nome ou tipo do usuário. Email não pode ser editado aqui.
                            </DialogDescription>
                          </DialogHeader>
                          {editingUser && (
                            <div className="space-y-4">
                              <div>
                                <Label>Nome Completo</Label>
                                <Input
                                  value={editingUser.nome}
                                  onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>ID</Label>
                                <Input
                                  value={editingUser.id}
                                  disabled
                                  placeholder="ID (não editável)"
                                />
                              </div>
                              <div>
                                <Label>Função</Label>
                                <Select
                                  value={editingUser.tipo_usuario}
                                  onValueChange={(value) => setEditingUser({ ...editingUser, tipo_usuario: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="usuario">Usuário</SelectItem>
                                    <SelectItem value="admin_equipamento">Admin Equipamento</SelectItem>
                                    {user?.user_metadata?.role === 'super_admin' && (
                                      <SelectItem value="super_admin">Super Admin</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={() => handleEditUser(editingUser)} className="w-full" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeUser(userItem.id)}
                        disabled={userItem.id === user?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersManager;
