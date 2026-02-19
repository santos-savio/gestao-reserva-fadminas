
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Building2, Settings, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const ResourcesManager = ({ user }) => {
  const [activeTab, setActiveTab] = useState('locations');

  const queryClient = useQueryClient();

  const [newLocation, setNewLocation] = useState({ name: '', description: '' });
  const [newEquipment, setNewEquipment] = useState({ name: '', description: '' });

  const {
    data: locations = [],
    isLoading: isLoadingLocations,
  } = useQuery({
    queryKey: ['locais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locais')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const {
    data: equipment = [],
    isLoading: isLoadingEquipment,
  } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipamentos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: async (payload: { nome: string; descricao?: string | null }) => {
      const { error } = await supabase.from('locais').insert({
        nome: payload.nome,
        descricao: payload.descricao ?? null,
        disponivel: true,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['locais'] });
      setNewLocation({ name: '', description: '' });
      toast({
        title: 'Local adicionado com sucesso!',
        description: 'O local foi adicionado à lista de locais.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o local.',
        variant: 'destructive',
      });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (payload: { id: string; disponivel: boolean }) => {
      const { error } = await supabase
        .from('locais')
        .update({ disponivel: payload.disponivel })
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['locais'] });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o local.',
        variant: 'destructive',
      });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('locais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['locais'] });
      toast({
        title: 'Local removido',
        description: 'O local foi removido com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o local.',
        variant: 'destructive',
      });
    },
  });

  const addEquipmentMutation = useMutation({
    mutationFn: async (payload: { nome: string; descricao?: string | null }) => {
      const { error } = await supabase.from('equipamentos').insert({
        nome: payload.nome,
        descricao: payload.descricao ?? null,
        disponivel: true,
        em_manutencao: false,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      setNewEquipment({ name: '', description: '' });
      toast({
        title: 'Equipamento adicionado com sucesso!',
        description: 'O equipamento foi adicionado à lista de equipamentos.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o equipamento.',
        variant: 'destructive',
      });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async (payload: { id: string; disponivel: boolean }) => {
      const { error } = await supabase
        .from('equipamentos')
        .update({ disponivel: payload.disponivel })
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o equipamento.',
        variant: 'destructive',
      });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipamentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast({
        title: 'Equipamento removido',
        description: 'O equipamento foi removido com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o equipamento.',
        variant: 'destructive',
      });
    },
  });

  const equipmentsByCategory = useMemo(() => {
    return {
      Equipamentos: equipment,
    };
  }, [equipment]);

  const handleAddLocation = () => {
    if (!newLocation.name.trim()) return;
    addLocationMutation.mutate({
      nome: newLocation.name.trim(),
      descricao: newLocation.description.trim() ? newLocation.description.trim() : null,
    });
  };

  const handleAddEquipment = () => {
    if (!newEquipment.name.trim()) return;
    addEquipmentMutation.mutate({
      nome: newEquipment.name.trim(),
      descricao: newEquipment.description.trim() ? newEquipment.description.trim() : null,
    });
  };

  const toggleLocationAvailability = (id: string, current: boolean) => {
    updateLocationMutation.mutate({ id, disponivel: !current });
  };

  const toggleEquipmentAvailability = (id: string, current: boolean) => {
    updateEquipmentMutation.mutate({ id, disponivel: !current });
  };

  const removeLocation = (id: string) => {
    deleteLocationMutation.mutate(id);
  };

  const removeEquipment = (id: string) => {
    deleteEquipmentMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Navegação por abas */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'locations'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="h-4 w-4 inline mr-2" />
          Locais
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'equipment'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="h-4 w-4 inline mr-2" />
          Equipamentos
        </button>
      </div>

      {/* Gerenciamento de Locais */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Gerenciar Locais</span>
              </CardTitle>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Local
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Local</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="location-name">Nome do Local</Label>
                      <Input
                        id="location-name"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        placeholder="Ex: Sala de Reunião C"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location-description">Descrição</Label>
                      <Input
                        id="location-description"
                        value={newLocation.description}
                        onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                        placeholder="(opcional)"
                      />
                    </div>
                    <Button onClick={handleAddLocation} className="w-full" disabled={addLocationMutation.isPending}>
                      Adicionar Local
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingLocations ? (
                  <div className="text-sm text-gray-600">Carregando...</div>
                ) : (
                  locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium">{location.nome}</h3>
                        {location.descricao ? (
                          <p className="text-sm text-gray-600">{location.descricao}</p>
                        ) : null}
                      </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={location.disponivel ? 'default' : 'secondary'}>
                        {location.disponivel ? 'Disponível' : 'Indisponível'}
                      </Badge>
                      <Switch
                        checked={!!location.disponivel}
                        onCheckedChange={() => toggleLocationAvailability(location.id, !!location.disponivel)}
                        disabled={updateLocationMutation.isPending}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeLocation(location.id)}
                        disabled={deleteLocationMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gerenciamento de Equipamentos */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Gerenciar Equipamentos</span>
              </CardTitle>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Equipamento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Equipamento</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="equipment-name">Nome do Equipamento</Label>
                      <Input
                        id="equipment-name"
                        value={newEquipment.name}
                        onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                        placeholder="Ex: Webcam HD"
                      />
                    </div>
                    <div>
                      <Label htmlFor="equipment-description">Descrição</Label>
                      <Input
                        id="equipment-description"
                        value={newEquipment.description}
                        onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
                        placeholder="(opcional)"
                      />
                    </div>
                    <Button onClick={handleAddEquipment} className="w-full" disabled={addEquipmentMutation.isPending}>
                      Adicionar Equipamento
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {isLoadingEquipment ? (
                  <div className="text-sm text-gray-600">Carregando...</div>
                ) : (
                  Object.entries(equipmentsByCategory).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="font-medium text-lg mb-3 text-gray-900">{category}</h3>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <h4 className="font-medium">{item.nome}</h4>
                              {item.descricao ? (
                                <p className="text-sm text-gray-600">{item.descricao}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={item.disponivel ? 'default' : 'secondary'}>
                                {item.disponivel ? 'Disponível' : 'Indisponível'}
                              </Badge>
                              <Switch
                                checked={!!item.disponivel}
                                onCheckedChange={() => toggleEquipmentAvailability(item.id, !!item.disponivel)}
                                disabled={updateEquipmentMutation.isPending}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeEquipment(item.id)}
                                disabled={deleteEquipmentMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ResourcesManager;
