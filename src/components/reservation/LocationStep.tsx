import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormData } from '@/hooks/useReservationForm';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LocationStepProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
}

export const LocationStep = ({ formData, setFormData }: LocationStepProps) => {
  const { data: locations = [], isLoading } = useQuery({
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Escolha o Local</h3>
        <p className="text-gray-600">Selecione onde será realizado o evento</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="text-sm text-gray-600">Carregando...</div>
        ) : (
          locations.map((location) => (
            <Card 
              key={location.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                formData.location === location.id 
                  ? "ring-2 ring-blue-500 bg-blue-50" 
                  : "hover:bg-gray-50"
              )}
              onClick={() => setFormData({ ...formData, location: location.id })}
            >
              <CardContent className="p-4 text-center">
                <h4 className="font-medium">{location.nome}</h4>
                {location.descricao ? (
                  <p className="text-sm text-gray-600 mt-1">{location.descricao}</p>
                ) : null}
                <p className="text-xs mt-2">
                  <span
                    className={cn(
                      'px-2 py-1 rounded-full',
                      location.disponivel ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {location.disponivel ? 'Disponível' : 'Indisponível'}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};